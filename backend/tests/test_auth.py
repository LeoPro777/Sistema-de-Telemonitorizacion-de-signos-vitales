"""
test_auth.py — Pruebas de integración de inicio y cierre de sesión con Google OAuth2
"""

import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from backend.main import app

@patch("backend.routes.auth.verify_google_id_token_async")
def test_login_logout_loop(mock_verify):
    """
    Prueba de integración que inicia y cierra sesión 10 veces seguidas
    para verificar la estabilidad del ciclo de autenticación y sesiones en MongoDB.
    """
    # Configuramos el mock de verificación de Google
    mock_verify.return_value = {
        "email": "testuser@gmail.com",
        "sub": "mock_google_id_12345",
        "given_name": "Test",
        "family_name": "User",
        "picture": "https://example.com/avatar.png"
    }

    with TestClient(app) as client:
        for i in range(1, 11):
            print(f"\n[Iteración {i}/10] Iniciando ciclo...")

            # 1. Intentar acceder a /me (Debe retornar 401 ya que no hay sesión)
            response_me_initial = client.get("/api/auth/me")
            assert response_me_initial.status_code == 401

            # 2. Iniciar sesión con Google (mocked)
            login_response = client.post(
                "/api/auth/google-login",
                json={
                    "token": "fake_google_token_xyz",
                    "redirect_uri": "http://localhost:5173/login"
                }
            )
            assert login_response.status_code == 200
            login_data = login_response.json()
            assert login_data["success"] is True
            assert login_data["user"]["email"] == "testuser@gmail.com"

            # Verificar que la cookie fue almacenada en el cliente
            assert "session_id" in client.cookies

            # 3. Consultar /me (Debe retornar 200 y el perfil del usuario)
            response_me_auth = client.get("/api/auth/me")
            assert response_me_auth.status_code == 200
            me_data = response_me_auth.json()
            assert me_data["email"] == "testuser@gmail.com"

            # 4. Cerrar sesión
            logout_response = client.post("/api/auth/logout")
            assert logout_response.status_code == 200
            assert logout_response.json()["message"] == "Sesión cerrada correctamente."

            # 5. Confirmar que la sesión ya no es válida (Debe retornar 401)
            response_me_final = client.get("/api/auth/me")
            assert response_me_final.status_code == 401

            print(f"[Iteración {i}/10] Completada con éxito.")
