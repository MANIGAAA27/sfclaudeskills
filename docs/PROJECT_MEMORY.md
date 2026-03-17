# Project Memory

Single source of truth for project knowledge. Persists across chat sessions so context is preserved when the agent chat limit is reached or a new window is opened.

**Usage**: Agents read this file at the start of build/orchestration or role-specific work. Update it when making decisions, completing work that affects others, or handing off to the next session or role.

---

## Architecture

### AE Agent (Agentforce Copilot)

An Agentforce agent launched from the **Account detail page** that provides Account Executive reps with instant account intelligence.

**Components:**
- **Bot Definition** (`bots/AE_Agent/AE_Agent.bot-meta.xml`) — Copilot-type Agentforce agent with `RecordId` and `ObjectApiName` context variables. Launches from Account record page.
- **GenAiPlanner** (`genAiPlanners/AE_Agent_Planner`) — Orchestrates topic selection based on user intent.
- **GenAiPlugin / Topic** (`genAiPlugins/AE_Agent_Account_Overview`) — "Account Overview" topic grouping two actions (Summary + 360).
- **GenAiFunctions / Actions:**
  - `Get_Account_Summary` — calls `AEAgentAccountSummary` (Invocable Apex) for basic account info.
  - `Get_Account_360` — calls `AEAgentAccount360` (Invocable Apex) for full 360 view.
- **Apex Invocable Actions:**
  - `AEAgentAccountSummary.cls` — returns name, industry, type, owner, revenue, employees, location.
  - `AEAgentAccount360.cls` — returns tenure, contracts/renewals, opportunities, cases, contacts, activities.
- **Test Classes:** `AEAgentAccountSummaryTest.cls`, `AEAgentAccount360Test.cls`.

**Data flow:**
1. User opens Account record page → clicks AE Agent in Agentforce panel
2. Agent receives `RecordId` (Account Id) from page context
3. Agent proactively calls `Get_Account_Summary` to show overview
4. User can ask for 360 view, renewals, pipeline, cases → agent calls `Get_Account_360`

**API Version:** 62.0

---

## Decisions

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-17 | Use native Agentforce (Bot copilot + GenAi metadata) instead of custom LWC | Leverages Salesforce's built-in AI orchestration, topic routing, and Einstein Trust Layer. No custom UI maintenance. |
| 2026-03-17 | Apex InvocableMethod for actions (not Flow) | More flexible for complex multi-object queries (Account + Contracts + Opps + Cases + Contacts + Activities). Better control over response formatting. |
| 2026-03-17 | Single topic "Account Overview" with two actions | Keeps agent focused. Summary for quick view, 360 for deep dive. Can expand with more topics later. |
| 2026-03-17 | `with sharing` on all Apex classes | Respects org security model; users only see data they have access to. |

---

## Current Focus

**AE Agent v1 — Complete**

All Agentforce metadata and Apex actions created:
- Bot definition (copilot type) with welcome dialog
- GenAiPlanner, GenAiPlugin (topic), GenAiFunctions (2 actions)
- Apex invocable actions with test classes
- Ready for deployment to a Salesforce org with Agentforce enabled

---

## Handoff Notes

**Next steps for deployment:**
1. Deploy to a Salesforce org with Agentforce enabled: `sf project deploy start -d force-app -o TARGET_ORG`
2. In Setup → Agents, activate the "AE Agent"
3. Add the Agentforce component to the Account Lightning Record Page (via Lightning App Builder)
4. Test with sample accounts that have contracts, opportunities, cases, and contacts
5. Optionally add more topics/actions (e.g., "Create Follow-up Task", "Log Activity", "Competitor Intelligence")

**Post-deployment config needed:**
- Assign the Agent to the Account record page via Lightning App Builder
- Ensure users have the Agentforce permission set assigned
- Verify field-level security for all queried fields

---

## Open Questions

- Should the agent auto-trigger `Get_Account_Summary` on load, or wait for user prompt? (Currently configured to proactively suggest via system message)
- Are there custom fields on Account for "Customer Since" date or "Renewal Date" that should replace standard CreatedDate/Contract.EndDate?
- Should the agent support additional objects beyond Account (e.g., launched from Opportunity page)?
