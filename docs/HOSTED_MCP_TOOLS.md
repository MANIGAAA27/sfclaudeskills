# Salesforce Hosted MCP — Server and tool reference

Condensed reference for [Salesforce Hosted MCP Servers](https://github.com/forcedotcom/mcp-hosted) (Beta). Full, up-to-date list: [Available Tools and Servers](https://github.com/forcedotcom/mcp-hosted/wiki/Available-Tools-and-Servers).

| Server | Main tools | Description |
|--------|------------|-------------|
| **platform/sobject-all** | soql_query, describe_global, describe_sobject, create_sobject_record, update_sobject_record, delete_sobject_record, get_related_records, update_related_record, delete_related_record, list_recent_sobject_records, find, get_user_info | Full CRUD, SOQL, SOSL, describe, relationships |
| **platform/sobject-reads** | soql_query, describe_global, describe_sobject, find, get_related_records, list_recent_sobject_records, get_user_info | Read-only data and schema |
| **platform/sobject-mutations** | soql_query, describe_global, describe_sobject, find, create_sobject_record, update_sobject_record, update_related_record | Create and update records |
| **sobject-deletes** | soql_query, describe_global, describe_sobject, find, delete_sobject_record, delete_related_record | Delete records |
| **platform/salesforce-api-context** | get_metadata_api_context, get_data_and_tooling_api_context | Metadata type definitions; Tooling/Data API context for generating metadata files and API requests |
| **invocable_actions** | get_invocable_actions, get_invocable_action_schema, invoke_invocable_action | Discover and invoke invocable actions (Flows, Apex, etc.) |
| **data-cloud-queries** | get_dc_metadata, post_dc_query_sql | Data Cloud metadata and SQL queries |
| **revenue-cloud** | soql_query, describe_global, describe_sobject, find, create_order_from_quote, add-nodes, delete-nodes, load-instance, update-nodes, place_sales_transaction, amend, cancel, renew, create_or_update_asset_from_order | Revenue Cloud, CPQ configurator, RLM, assets |
| **insurance-cloud** | soql_query, describe_global, describe_sobject, find, product clauses, surcharges, underwriting rules, get_insurance_policy_details, get_insurance_quote_details | Insurance Cloud |
| **pricing-ngp** | get_price | Pricing (NGP) |
| **analytics/tableau-next** | list_semantic_models, list_dashboards, list_visualizations, get_semantic_model, analyze_data, list_workspaces, search_assets, and related dimension/measure/metric APIs | Tableau Next / semantic models and analytics |

Use this list to choose the right server when the host is configured for Salesforce Hosted MCP (e.g. SOQL/describe → sobject-reads or sobject-all; metadata context → salesforce-api-context; invocable flows → invocable_actions).
