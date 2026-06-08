"""
test_profile.py — Pruebas de integración para las rutas de Perfil de Usuario (/api/profile)
"""

import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from backend.main import app
from backend.services.database import db_service

@patch("backend.routes.auth.verify_google_id_token_async")
def test_get_and_update_profile(mock_verify):
    """
    Prueba que inicia sesión, obtiene el perfil (debería crearse el de defecto sin lanzar 500)
    y luego actualiza la información del perfil.
    """
    mock_verify.return_value = {
        "email": "testprofileuser@gmail.com",
        "sub": "mock_google_id_98765",
        "given_name": "Juan",
        "family_name": "Perez",
        "picture": "https://example.com/avatar_juan.png"
    }

    with TestClient(app) as client:
        # 1. Iniciar sesión para obtener cookie de sesión
        login_response = client.post(
            "/api/auth/google-login",
            json={
                "token": "fake_token_profile_test",
                "redirect_uri": "http://localhost:5173/login"
            }
        )
        assert login_response.status_code == 200
        
        # 3. Consultar /api/profile (debería inicializarlo sin error)
        profile_response = client.get("/api/profile")
        assert profile_response.status_code == 200
        profile_data = profile_response.json()
        assert profile_data["personal_data"]["email"] == "testprofileuser@gmail.com"
        assert profile_data["personal_data"]["first_name"] == "Juan"
        
        # 4. Actualizar el perfil
        update_payload = {
            "personal_data": {
                "phone": "+56 9 1111 2222",
                "address": "Nueva direccion 123"
            }
        }
        update_response = client.put("/api/profile", json=update_payload)
        assert update_response.status_code == 200
        updated_data = update_response.json()
        assert updated_data["personal_data"]["phone"] == "+56 9 1111 2222"
        assert updated_data["personal_data"]["address"] == "Nueva direccion 123"
