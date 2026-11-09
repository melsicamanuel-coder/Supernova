import aiosqlite
from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver
from langgraph.graph import END, START, StateGraph

from app.orchestrator.nodes import (
    approval_gate_node,
    ceo_evaluate_node,
    ceo_review_node,
    cpo_define_node,
    cto_design_node,
    eng_plan_node,
    qa_plan_node,
    research_node,
    route_after_ceo_evaluate,
)
from app.orchestrator.state import SharedProjectState

CHECKPOINT_DB = "supernova_checkpoints.db"


def build_graph() -> StateGraph:
    graph = StateGraph(SharedProjectState)

    graph.add_node("ceo_evaluate", ceo_evaluate_node)
    graph.add_node("research", research_node)
    graph.add_node("cpo_define", cpo_define_node)
    graph.add_node("cto_design", cto_design_node)
    graph.add_node("eng_plan", eng_plan_node)
    graph.add_node("qa_plan", qa_plan_node)
    graph.add_node("ceo_review", ceo_review_node)
    graph.add_node("approval_gate", approval_gate_node)

    graph.add_edge(START, "ceo_evaluate")

    graph.add_conditional_edges(
        "ceo_evaluate",
        route_after_ceo_evaluate,
        {"research": "research", "end": END},
    )

    graph.add_edge("research", "cpo_define")
    graph.add_edge("cpo_define", "cto_design")
    graph.add_edge("cto_design", "eng_plan")
    graph.add_edge("eng_plan", "qa_plan")
    graph.add_edge("qa_plan", "ceo_review")
    graph.add_edge("ceo_review", "approval_gate")
    graph.add_edge("approval_gate", END)

    return graph


_checkpointer: AsyncSqliteSaver | None = None


async def get_checkpointer() -> AsyncSqliteSaver:
    global _checkpointer
    if _checkpointer is None:
        conn = await aiosqlite.connect(CHECKPOINT_DB)
        _checkpointer = AsyncSqliteSaver(conn)
        await _checkpointer.setup()
    return _checkpointer


async def get_compiled_graph():
    checkpointer = await get_checkpointer()
    graph = build_graph()
    return graph.compile(
        checkpointer=checkpointer,
        interrupt_before=["approval_gate"],
    )
