"""
patients.py — Rutas REST de Gestión de Pacientes, Alertas y Exportación de Signos Vitales
"""

import csv
import json
import logging
from io import StringIO, BytesIO
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

# ReportLab para la generación de informes médicos en PDF de calidad clínica
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

from backend.services.database import db_service
from backend.routes.auth import get_current_user
from backend.models.user import UserResponse, UserRole, TelemetryStatus
from backend.models.__init__ import PyObjectId
from backend.routes.dashboard import invalidate_dashboard_kpis

logger = logging.getLogger("app.patients")
router = APIRouter(prefix="/patients", tags=["Gestión de Pacientes (M4)"])

# --- ESQUEMAS PYDANTIC ---
class HeartRateThreshold(BaseModel):
    min_bpm: int = 60
    max_bpm: int = 100

class Spo2Threshold(BaseModel):
    critical_min_percent: int = 92

class TemperatureThreshold(BaseModel):
    min_celsius: float = 35.5
    max_celsius: float = 37.5

class ClinicalThresholdsUpdate(BaseModel):
    heart_rate: HeartRateThreshold
    spo2: Spo2Threshold
    temperature: TemperatureThreshold

class MedicalHistorySummaryUpdate(BaseModel):
    blood_type: str
    pathologies: List[str] = Field(default_factory=list)
    allergies: List[str] = Field(default_factory=list)
    notes: Optional[str] = ""

class PatientUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    is_active: Optional[bool] = None
    clinical_thresholds: Optional[ClinicalThresholdsUpdate] = None
    medical_history_summary: Optional[MedicalHistorySummaryUpdate] = None
    assigned_doctor_id: Optional[str] = None
    assigned_device_id: Optional[str] = None
    client_id: Optional[str] = None


# --- RUTAS ---

@router.get("")
async def get_patients(
    current_user: UserResponse = Depends(get_current_user),
    search: Optional[str] = Query(None, description="Buscador por nombre o ID médico"),
    criticality: Optional[str] = Query(None, description="Filtrar por severidad: NORMAL, WARNING, CRITICAL"),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1)
):
    """
    Obtiene la lista de pacientes registrados.
    Soporta filtros de severidad actual, búsqueda semántica y paginación.
    Administradores ven todo; Doctores ven pacientes asignados; Clientes ven pacientes de su clínica.
    """
    query = {}
    
    # 1. Filtros por rol
    if current_user.role == UserRole.DOCTOR:
        # Encontrar al doctor en la base de datos
        doctor = await db_service.db.doctors.find_one({"user_id": ObjectId(current_user.id)})
        if doctor:
            query["assigned_doctor_id"] = doctor["_id"]
    elif current_user.role == UserRole.CLIENT:
        # Encontrar al cliente en la base de datos
        client = await db_service.db.clients.find_one({"user_id": ObjectId(current_user.id)})
        if client:
            query["client_id"] = client["_id"]
    elif current_user.role == UserRole.PATIENT:
        query["user_id"] = ObjectId(current_user.id)

    # 2. Búsqueda semántica (Nombre, Apellido, Cédula o ID de expediente)
    if search:
        query["$or"] = [
            {"first_name": {"$regex": search, "$options": "i"}},
            {"last_name": {"$regex": search, "$options": "i"}},
            {"national_id": {"$regex": search, "$options": "i"}},
            {"medical_record_id": {"$regex": search, "$options": "i"}}
        ]

    # 3. Filtrado por criticidad de alertas clínicas
    if criticality:
        if criticality == TelemetryStatus.CRITICAL:
            query["has_active_alert"] = True
        else:
            # Para WARNING o NORMAL, evaluamos basándonos en last_telemetry_cache
            # (En un ambiente de producción completo evaluaríamos campos específicos)
            query["has_active_alert"] = False

    # 4. Paginación
    skip = (page - 1) * limit
    cursor = db_service.db.patients.find(query).skip(skip).limit(limit)
    patients_list = []
    
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        if doc.get("assigned_doctor_id"):
            doc["assigned_doctor_id"] = str(doc["assigned_doctor_id"])
        if doc.get("assigned_device_id"):
            doc["assigned_device_id"] = str(doc["assigned_device_id"])
        if doc.get("client_id"):
            doc["client_id"] = str(doc["client_id"])
        if doc.get("user_id"):
            doc["user_id"] = str(doc["user_id"])
        patients_list.append(doc)

    total_count = await db_service.db.patients.count_documents(query)

    return {
        "patients": patients_list,
        "total": total_count,
        "page": page,
        "limit": limit
    }


@router.get("/alerts/recent")
async def get_recent_alerts(
    status_filter: Optional[str] = Query(None, description="Filtros: ACTIVE, RESOLVED"),
    limit: int = Query(20, ge=1, le=100),
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Obtiene las alertas recientes de los pacientes asociados al usuario actual.
    Administradores ven todo; Doctores ven pacientes asignados; Clientes ven pacientes de su clínica.
    """
    patient_query = {}
    if current_user.role == UserRole.DOCTOR:
        doctor = await db_service.db.doctors.find_one({"user_id": ObjectId(current_user.id)})
        if doctor:
            patient_query["assigned_doctor_id"] = doctor["_id"]
        else:
            return []
    elif current_user.role == UserRole.CLIENT:
        client = await db_service.db.clients.find_one({"user_id": ObjectId(current_user.id)})
        if client:
            patient_query["client_id"] = client["_id"]
        else:
            return []
    elif current_user.role == UserRole.PATIENT:
        patient_query["user_id"] = ObjectId(current_user.id)

    # Buscar todos los pacientes para armar un mapa de IDs a nombres
    patients_cursor = db_service.db.patients.find(patient_query, {"_id": 1, "first_name": 1, "last_name": 1})
    patient_map = {}
    async for p in patients_cursor:
        patient_map[p["_id"]] = f"{p.get('first_name', '')} {p.get('last_name', '')}".strip()

    patient_ids = list(patient_map.keys())
    if not patient_ids:
        return []

    # Consultar alertas de esos pacientes
    query = {"patient_id": {"$in": patient_ids}}
    if status_filter:
        query["status"] = status_filter

    cursor = db_service.db.alerts.find(query).sort("created_at", -1).limit(limit)
    alerts_list = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        doc["patient_id"] = str(doc["patient_id"])
        if doc.get("device_id"):
            doc["device_id"] = str(doc["device_id"])
        if doc.get("resolved_by"):
            doc["resolved_by"] = str(doc["resolved_by"])
        doc["patient_name"] = patient_map.get(ObjectId(doc["patient_id"]), "Paciente Desconocido")
        alerts_list.append(doc)

    return alerts_list


@router.get("/{id}")
async def get_patient_detail(id: str, current_user: UserResponse = Depends(get_current_user)):
    """
    Retorna el expediente completo de un paciente específico.
    """
    patient = await db_service.db.patients.find_one({"_id": ObjectId(id)})
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Paciente no encontrado."
        )

    # Formatear IDs a strings
    patient["_id"] = str(patient["_id"])
    if patient.get("assigned_doctor_id"):
        patient["assigned_doctor_id"] = str(patient["assigned_doctor_id"])
    if patient.get("assigned_device_id"):
        patient["assigned_device_id"] = str(patient["assigned_device_id"])
    if patient.get("client_id"):
        patient["client_id"] = str(patient["client_id"])
    if patient.get("user_id"):
        patient["user_id"] = str(patient["user_id"])

    return patient


@router.put("/{id}")
async def update_patient(
    id: str,
    req: PatientUpdate,
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Actualiza datos del expediente médico del paciente.
    Soporta calibrar Sliders de clinical_thresholds y campos de medical_history_summary.
    """
    # 1. Verificar existencia
    patient = await db_service.db.patients.find_one({"_id": ObjectId(id)})
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Paciente no encontrado."
        )

    # 2. Construir objeto de actualización
    update_data = {}
    if req.first_name is not None:
        update_data["first_name"] = req.first_name
    if req.last_name is not None:
        update_data["last_name"] = req.last_name
    if req.is_active is not None:
        update_data["is_active"] = req.is_active
    
    if req.clinical_thresholds is not None:
        if current_user.role == UserRole.CLIENT:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Los clientes no tienen permisos para modificar umbrales clínicos."
            )
        # En MongoDB los guardamos en su formato embebido
        update_data["clinical_thresholds"] = req.clinical_thresholds.model_dump()
        
    if req.medical_history_summary is not None:
        update_data["medical_history_summary"] = req.medical_history_summary.model_dump()

    if req.assigned_doctor_id is not None:
        if current_user.role != UserRole.ADMIN:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo los administradores pueden asignar médicos.")
        update_data["assigned_doctor_id"] = ObjectId(req.assigned_doctor_id) if req.assigned_doctor_id else None

    if req.client_id is not None:
        if current_user.role != UserRole.ADMIN:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo los administradores pueden asignar clientes.")
        update_data["client_id"] = ObjectId(req.client_id) if req.client_id else None

    if req.assigned_device_id is not None:
        if current_user.role != UserRole.ADMIN:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo los administradores pueden asignar dispositivos.")
        old_device_id = patient.get("assigned_device_id")
        new_device_id = ObjectId(req.assigned_device_id) if req.assigned_device_id else None
        
        if old_device_id != new_device_id:
            # 1. Liberar el dispositivo anterior
            if old_device_id:
                await db_service.db.devices.update_one(
                    {"_id": old_device_id},
                    {"$set": {"operational_status": "AVAILABLE"}}
                )
            # 2. Reservar el nuevo dispositivo
            if new_device_id:
                await db_service.db.devices.update_one(
                    {"_id": new_device_id},
                    {"$set": {"operational_status": "ASSIGNED"}}
                )
            update_data["assigned_device_id"] = new_device_id

    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se proporcionaron datos para actualizar."
        )

    # 3. Guardar en MongoDB
    res = await db_service.db.patients.find_one_and_update(
        {"_id": ObjectId(id)},
        {"$set": update_data},
        return_document=True
    )

    await invalidate_dashboard_kpis(ObjectId(id))

    res["_id"] = str(res["_id"])
    if res.get("assigned_doctor_id"):
        res["assigned_doctor_id"] = str(res["assigned_doctor_id"])
    if res.get("assigned_device_id"):
        res["assigned_device_id"] = str(res["assigned_device_id"])
    if res.get("client_id"):
        res["client_id"] = str(res["client_id"])
    if res.get("user_id"):
        res["user_id"] = str(res["user_id"])

    return {
        "message": "Expediente del paciente actualizado exitosamente.",
        "patient": res
    }


@router.get("/{id}/vitals-history")
async def get_vitals_history(
    id: str,
    limit: int = Query(50, ge=1, le=1000),
    start_time: Optional[str] = Query(None, description="ISO 8601 start time"),
    end_time: Optional[str] = Query(None, description="ISO 8601 end time"),
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Retorna el historial cronológico de telemetría de vital_signs_history.
    Permite filtrar por rango de tiempo explícito (start_time, end_time).
    """
    query: dict = {"patient_id": ObjectId(id)}
    
    if start_time or end_time:
        time_query = {}
        if start_time:
            time_query["$gte"] = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
        if end_time:
            time_query["$lte"] = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
        query["timestamp"] = time_query

    cursor = db_service.db.vital_signs_history.find(query).sort("timestamp", -1).limit(limit)

    history = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        doc["patient_id"] = str(doc["patient_id"])
        history.append(doc)

    return history


@router.get("/{id}/alerts")
async def get_patient_alerts(
    id: str,
    status_filter: Optional[str] = Query(None, description="Filtros: ACTIVE, RESOLVED"),
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Obtiene la bitácora de alertas del paciente de la colección `alerts`.
    """
    query = {"patient_id": ObjectId(id)}
    if status_filter:
        query["status"] = status_filter

    cursor = db_service.db.alerts.find(query).sort("created_at", -1)
    alerts = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        doc["patient_id"] = str(doc["patient_id"])
        if doc.get("device_id"):
            doc["device_id"] = str(doc["device_id"])
        if doc.get("resolved_by"):
            doc["resolved_by"] = str(doc["resolved_by"])
        alerts.append(doc)

    return alerts


@router.post("/{id}/alerts/{alert_id}/resolve")
async def resolve_alert(
    id: str,
    alert_id: str,
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Permite a un médico resolver/reconocer una alerta crítica activa.
    Actualiza el documento en `alerts` y recalcula si el paciente tiene más alertas activas en paralelo.
    """
    now = datetime.now(timezone.utc)
    
    # 1. Resolver la alerta en MongoDB
    res = await db_service.db.alerts.find_one_and_update(
        {"_id": ObjectId(alert_id), "patient_id": ObjectId(id)},
        {
            "$set": {
                "status": "RESOLVED",
                "resolved_at": now,
                "resolved_by": ObjectId(current_user.id)
            }
        },
        return_document=True
    )
    
    if not res:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alerta no encontrada o ya resuelta."
        )

    from backend.routes.vitals import manager

    # 2. Recalcular si quedan alertas activas para el paciente
    active_alerts_count = await db_service.db.alerts.count_documents({
        "patient_id": ObjectId(id),
        "status": "ACTIVE"
    })
    
    has_active = active_alerts_count > 0
    await db_service.db.patients.update_one(
        {"_id": ObjectId(id)},
        {"$set": {"has_active_alert": has_active}}
    )

    # 3. Notificar globalmente para actualizar dashboards en tiempo real
    await invalidate_dashboard_kpis(ObjectId(id))
    await manager.broadcast_global({"type": "ALERTS_CHANGED"})

    return {
        "message": "Alerta resuelta con éxito.",
        "active_alerts_remaining": active_alerts_count,
        "has_active_alert": has_active
    }


# --- MOTOR DE EXPORTACIÓN Y DESCARGA DE DATOS ---

@router.get("/{id}/export/{format}")
async def export_patient_data(
    id: str,
    format: str,
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Exportación e informe clínico de los signos vitales del paciente.
    Soporta formatos JSON, CSV, y PDF clínico autogenerado de alta fidelidad.
    """
    patient = await db_service.db.patients.find_one({"_id": ObjectId(id)})
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paciente no encontrado.")

    # Obtener historial de lecturas de vital_signs_history
    cursor = db_service.db.vital_signs_history.find({"patient_id": ObjectId(id)}).sort("timestamp", -1).limit(100)
    history = []
    async for doc in cursor:
        history.append(doc)

    patient_name = f"{patient['first_name']} {patient['last_name']}"
    filename_base = f"Reporte_Clinico_{patient_name.replace(' ', '_')}_{datetime.now(timezone(timedelta(hours=-4))).strftime('%Y%m%d')}"

    # 1. EXPORTACIÓN EN FORMATO JSON
    if format.lower() == "json":
        json_data = []
        for doc in history:
            json_data.append({
                "timestamp": doc["timestamp"].isoformat(),
                "heart_rate": doc["telemetry"]["heart_rate"],
                "spo2": doc["telemetry"]["spo2"],
                "temperature": doc["telemetry"]["temperature"]
            })
        
        payload = {
            "patient_id": id,
            "patient_name": patient_name,
            "medical_record_id": patient.get("medical_record_id"),
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "vital_signs_history": json_data
        }
        
        return StreamingResponse(
            iter([json.dumps(payload, indent=2)]),
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename={filename_base}.json"}
        )

    # 2. EXPORTACIÓN EN FORMATO CSV
    elif format.lower() == "csv":
        output = StringIO()
        writer = csv.writer(output)
        
        # Escribir cabeceras
        writer.writerow(["Fecha y Hora (UTC)", "Frecuencia Cardiaca (bpm)", "Saturación de Oxígeno (SpO2 %)", "Temperatura (°C)"])
        
        for doc in history:
            writer.writerow([
                doc["timestamp"].strftime("%Y-%m-%d %H:%M:%S"),
                doc["telemetry"]["heart_rate"],
                doc["telemetry"]["spo2"],
                doc["telemetry"]["temperature"]
            ])
            
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename_base}.csv"}
        )

    # 3. EXPORTACIÓN EN FORMATO PDF CLÍNICO (Generado con ReportLab)
    elif format.lower() == "pdf":
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        styles = getSampleStyleSheet()
        
        # Crear estilos personalizados Premium Dark / Light clínico
        title_style = ParagraphStyle(
            name='ClinicTitle',
            parent=styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=22,
            textColor=colors.HexColor('#0F1420'),
            spaceAfter=6
        )
        
        subtitle_style = ParagraphStyle(
            name='ClinicSubtitle',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=9,
            textColor=colors.HexColor('#D4AF37'),
            spaceAfter=15,
            textTransform='uppercase'
        )

        h2_style = ParagraphStyle(
            name='SectionHeading',
            parent=styles['Heading2'],
            fontName='Helvetica-Bold',
            fontSize=13,
            textColor=colors.HexColor('#1E2640'),
            spaceBefore=12,
            spaceAfter=8
        )

        body_style = styles['Normal']
        body_bold = ParagraphStyle(
            name='BodyBold',
            parent=styles['Normal'],
            fontName='Helvetica-Bold'
        )

        story = []

        # Cabecera de branding médico
        story.append(Paragraph("AURA BIOMEDICAL SYSTEMS", subtitle_style))
        story.append(Paragraph("Informe Clínico de Signos Vitales", title_style))
        story.append(Spacer(1, 10))

        # Ficha del Paciente (Tabla de Datos Generales)
        patient_info_data = [
            [Paragraph("Paciente:", body_bold), Paragraph(patient_name, body_style),
             Paragraph("Expediente Médico:", body_bold), Paragraph(patient.get("medical_record_id", "N/A"), body_style)],
            [Paragraph("Identificación:", body_bold), Paragraph(patient.get("national_id", "N/A"), body_style),
             Paragraph("Fecha Exportación:", body_bold), Paragraph(datetime.now(timezone(timedelta(hours=-4))).strftime("%Y-%m-%d %H:%M:%S"), body_style)],
            [Paragraph("Grupo Sanguíneo:", body_bold), Paragraph(patient.get("medical_history_summary", {}).get("blood_type", "O+"), body_style),
             Paragraph("Estado de Cuenta:", body_bold), Paragraph("Activo" if patient.get("is_active") else "Inactivo", body_style)]
        ]
        
        info_table = Table(patient_info_data, colWidths=[100, 160, 120, 160])
        info_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ]))
        
        story.append(info_table)
        story.append(Spacer(1, 15))

        # Límites Clínicos Configurados
        story.append(Paragraph("Umbrales Clínicos Configurados", h2_style))
        thresh = patient.get("clinical_thresholds", {})
        thresh_data = [
            ["Frecuencia Cardiaca", f"{thresh.get('heart_rate', {}).get('min_bpm', 60)} - {thresh.get('heart_rate', {}).get('max_bpm', 100)} bpm",
             "Saturación de Oxígeno (SpO2)", f"Mínimo Crítico: {thresh.get('spo2', {}).get('critical_min_percent', 92)}%"],
            ["Temperatura Corporal", f"{thresh.get('temperature', {}).get('min_celsius', 35.5)} - {thresh.get('temperature', {}).get('max_celsius', 37.5)} °C", "", ""]
        ]
        thresh_table = Table(thresh_data, colWidths=[140, 120, 160, 120])
        thresh_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#FFFDF5')),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#F5E6BE')),
            ('TOPPADDING', (0,0), (-1,-1), 5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ]))
        story.append(thresh_table)
        story.append(Spacer(1, 15))

        # Tabla del Historial Reciente (Últimas 15 ráfagas)
        story.append(Paragraph("Registro Cronológico Reciente (Signos Vitales)", h2_style))
        
        table_headers = ["Fecha y Hora", "Ritmo Cardíaco (bpm)", "Saturación SpO2 (%)", "Temperatura (°C)"]
        history_table_data = [table_headers]
        
        for doc in history[:15]: # Limitar a las últimas 15 filas para que quepa en una sola hoja
            history_table_data.append([
                doc["timestamp"].strftime("%Y-%m-%d %H:%M:%S"),
                doc["telemetry"]["heart_rate"],
                f"{doc['telemetry']['spo2']}%",
                f"{doc['telemetry']['temperature']} °C"
            ])
            
        history_table = Table(history_table_data, colWidths=[150, 130, 130, 130])
        history_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1E2640')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F8FAFC')]),
            ('TOPPADDING', (0,0), (-1,-1), 5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ]))
        story.append(history_table)
        
        doc.build(story)
        buffer.seek(0)
        
        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename_base}.pdf"}
        )

    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Formato de exportación no soportado.")
