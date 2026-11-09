import asyncio

import pytest


@pytest.mark.asyncio
async def test_start_workflow_creates_run(client):
    create_resp = await client.post("/api/projects", json={
        "name": "Workflow Test",
        "idea_text": "A test project for workflow testing",
    })
    assert create_resp.status_code == 201
    project_id = create_resp.json()["id"]

    start_resp = await client.post(f"/api/projects/{project_id}/workflow/start")
    assert start_resp.status_code == 201
    data = start_resp.json()
    assert data["project_id"] == project_id
    assert data["status"] == "running"
    assert data["id"]


@pytest.mark.asyncio
async def test_start_workflow_sets_project_active(client):
    create_resp = await client.post("/api/projects", json={
        "name": "Active Test",
        "idea_text": "Testing that project becomes active",
    })
    project_id = create_resp.json()["id"]

    await client.post(f"/api/projects/{project_id}/workflow/start")
    project_resp = await client.get(f"/api/projects/{project_id}")
    assert project_resp.json()["status"] == "active"


@pytest.mark.asyncio
async def test_cannot_start_workflow_on_active_project(client):
    create_resp = await client.post("/api/projects", json={
        "name": "Double Start",
        "idea_text": "Should fail on second start",
    })
    project_id = create_resp.json()["id"]

    await client.post(f"/api/projects/{project_id}/workflow/start")
    second_resp = await client.post(f"/api/projects/{project_id}/workflow/start")
    assert second_resp.status_code == 400


@pytest.mark.asyncio
async def test_get_workflow_after_start(client):
    create_resp = await client.post("/api/projects", json={
        "name": "Get Workflow",
        "idea_text": "Testing workflow retrieval",
    })
    project_id = create_resp.json()["id"]
    await client.post(f"/api/projects/{project_id}/workflow/start")

    get_resp = await client.get(f"/api/projects/{project_id}/workflow")
    assert get_resp.status_code == 200
    data = get_resp.json()
    assert data["project_id"] == project_id


@pytest.mark.asyncio
async def test_demo_start(client):
    resp = await client.post("/api/demo/start")
    assert resp.status_code == 200
    data = resp.json()
    assert "project_id" in data
    assert "workflow_run_id" in data

    project_resp = await client.get(f"/api/projects/{data['project_id']}")
    assert project_resp.status_code == 200
    assert project_resp.json()["is_demo"] is True
    assert project_resp.json()["name"] == "TaskFlow"
