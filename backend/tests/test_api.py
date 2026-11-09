import pytest


@pytest.mark.asyncio
async def test_health(client):
    resp = await client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"


@pytest.mark.asyncio
async def test_create_project(client):
    resp = await client.post("/api/projects", json={
        "name": "Test Project",
        "idea_text": "A test idea for automated testing",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Test Project"
    assert data["status"] == "draft"
    assert data["id"]


@pytest.mark.asyncio
async def test_list_projects(client):
    await client.post("/api/projects", json={
        "name": "Project A",
        "idea_text": "Idea A",
    })
    await client.post("/api/projects", json={
        "name": "Project B",
        "idea_text": "Idea B",
    })
    resp = await client.get("/api/projects")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 2
    assert len(data["items"]) == 2


@pytest.mark.asyncio
async def test_get_project(client):
    create_resp = await client.post("/api/projects", json={
        "name": "Get Me",
        "idea_text": "Find this project",
    })
    project_id = create_resp.json()["id"]
    resp = await client.get(f"/api/projects/{project_id}")
    assert resp.status_code == 200
    assert resp.json()["name"] == "Get Me"


@pytest.mark.asyncio
async def test_update_project(client):
    create_resp = await client.post("/api/projects", json={
        "name": "Original",
        "idea_text": "Original idea",
    })
    project_id = create_resp.json()["id"]
    resp = await client.patch(f"/api/projects/{project_id}", json={
        "name": "Updated",
    })
    assert resp.status_code == 200
    assert resp.json()["name"] == "Updated"


@pytest.mark.asyncio
async def test_delete_project(client):
    create_resp = await client.post("/api/projects", json={
        "name": "Delete Me",
        "idea_text": "Going away",
    })
    project_id = create_resp.json()["id"]
    resp = await client.delete(f"/api/projects/{project_id}")
    assert resp.status_code == 204

    resp = await client.get(f"/api/projects/{project_id}")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_settings(client):
    resp = await client.get("/api/settings")
    assert resp.status_code == 200
    data = resp.json()
    assert data["active_provider"] == "mock"
    assert "mock" in data["available_providers"]


@pytest.mark.asyncio
async def test_health_check(client):
    resp = await client.get("/api/settings/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"]["healthy"] is True


@pytest.mark.asyncio
async def test_agents_list(client):
    resp = await client.get("/api/agents")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["agents"]) == 6
    types = {a["type"] for a in data["agents"]}
    assert types == {"ceo", "research", "cpo", "cto", "engineering", "qa"}
