# Universal Creator templates, variations and project library

**Status: binding design contract; implementation scheduled.** Every creator-authored entity or configuration that can be built in MudMaker can be saved to the project's reusable library as a versioned template, including rooms, exits, NPCs, player character bases, creatures, items, weapons, containers, equipment, vehicles, trains, shops, merchants, interactive objects, combat rulesets, abilities, dialogues, quests, world events, weather, schedules, spawners, role modules, graph behaviors and custom ECS combinations. **No NPC-only templates and no separate template engines for each feature.** The word *Blueprint* in existing contracts is the canonical reusable template asset.

## Creator workflow: simple first, complete management

Every eligible Creator inspector/editor has **Save as Template**, **Save Changes** (editable template draft), **Create Variation**, and **Place/Create from Template**. When an entity already comes from a template, the inspector offers **Edit Instance**, **Edit Template Draft**, **Create Variation From This**, and **Detach Into Independent Template** with clear impact explanation. One searchable **Template Library** is accessible from the Creator landing page, asset picker, map placement, NPC Studio, Item/Inventory, combat, and Data Manager. Templates remain project-owned, not global account files.

Library views provide:
- **Search** by display name, alias, description, tag, folder/group, asset type, component/role capability, author, creation/edit time, published/draft status and stable asset ID. Index queries and paginate for large projects. Use consistent normalized exact/prefix and optional full-text search; do not require all assets loaded into UI.
- **Organize** with nested folders/groups, multi-value creator tags, favorites, recent and saved filter views. Folder placement and tags are metadata; neither changes game behavior nor ownership. A template can have many tags but one primary folder. Move/bulk-tag and search across folders.
- **Rename** display name and optional aliases without changing the immutable template ID. Rename affects Creator/library display metadata; instances keep their own names unless the creator explicitly selects a propagation operation. Existing references by ID remain valid.
- **Duplicate** as a separate independent template, or **Create Variation** as a child template with a pinned parent revision and explicit overridden component fields/assets. Both actions are visible and explain the difference.
- **Archive/Restore** to hide from default creation without breaking references. **Delete** uses a Where Used review listing child variations, draft/published instances, quests/scripts/graphs, spawners, maps and active hosts. Default is *deny deletion when references exist*. Explicit destructive deletion only for unreferenced draft templates, after confirmation and transactional index cleanup. Published/referenced revisions are immutable and retained for recovery; remove from new-use catalog by archive/deprecate, not cascade-delete active worlds.
- **Import/Export within project** versioned packages with stable ID remapping, dependency manifests, provenance, permissions and conflict preview. Moving/copying templates between projects never retains authority to private identities, world IDs or executable scripts from an untrusted package.

All operations have accessible keyboard/touch controls, undo before save, explicit validation/confirmation and real persistence across closing/reopening projects or restarting MudMaker. **No file system dialogs or hand-written JSON required** for standard use. Empty library includes Create Template and start-from-preset actions.

## Canonical data model and variations

`TemplateAsset`: immutable logical `TemplateId` (project-scoped GUID), `Revision`, `Kind`, `Name`, `Aliases`, `Description`, `FolderId`, tag IDs, author/time metadata, status (Draft/Published/Archived), optional `ParentTemplateId` and **pinned** `ParentRevision`, component/graph/asset references, manifest hash and compatible schema version. Versions are immutable after publication; editable drafts create a later revision.

`TemplateInstanceBinding`: entity or other configured asset reference, source `TemplateId` and source revision, instance-specific overrides and independent stable identity. **An instance is not the template itself.** Editing a template does not silently rewrite already published worlds or live placed instances. Creators can explicitly **Rebase Instance / Upgrade Variation** with a field-by-field diff, migration preview and validation, never automatic unreviewed mutation.

`TemplateFolder` and `TemplateTag`: project-scoped stable IDs, unique normalized display key **within folder/scope**, metadata and revision. Renaming a folder/tag preserves IDs and reassociates no assets by string replacement. Moving folders cannot introduce cycles; deleting nonempty folders prompts move contents or archive, never silently deletes templates. Deleting a tag removes classification only after preview; it does not remove templates.

**Variation resolution:** start at the pinned immutable parent revision; apply child's explicit component-level/field-level add/replace/remove patches; then apply instance overrides. Resolution order is parent → child variation chain → instance. A child never edits its parent. Maximum variation inheritance depth is **16**; cycles, missing pinned parents, conflicting component schema revisions, invalid typed field removals and broken dependencies block publish, with actionable UI diagnostics. An absent override inherits the parent; an explicit removal is a typed tombstone, not a null that might ambiguously mean inherit. Composite templates embed/reference child templates with explicit pinned revisions and validated containment/reference rules.

**Groups vs role modules vs inheritance:** folders and tags organize only. NPC Guard/Merchant modules, item/equipment capabilities and combat behavior modules are typed functional composition. A variation extends an actual reusable asset revision. The UI must not conflate these three concepts.

## Storage, publication and recovery

Templates, variations, tags, folders, saved filters and metadata are persisted to the **same automatic embedded project database** and versioned release/asset store as other MudMaker assets. Project reopen/restart, backup/restore, migration and export/import preserve stable template IDs, parent links, tags and revision history. No cloud service or external database required. Search indexes are rebuildable and must not be treated as canonical storage.

Draft saves are transactional and use expectedRevision conflicts; published releases pin a dependency-closed graph of exact template revisions. Deleting/archive/rename of a draft template cannot rewrite a running host's immutable release. Rename updates searchable metadata and audit trail, not the published behavior hash unless behavior fields themselves changed. Broken parent dependency, corrupted manifest or invalid migration produce a clear error and preserve last valid asset. Project backups include the template library and referenced revisions.

Library UI supports **Where Used**, revision history/diff, dependency and version warnings, asset preview and test/placement. Every editor capable of creating a new eligible asset is equally capable of saving it as a reusable template. Template libraries must scale to at least **100,000** entries using indexed pagination and virtualization.

## C# and graph integration

A custom entity assembled using C# scripts and custom ECS components can be saved as a template with **references to pinned script/graph assets**, schema versions and capability manifests. Templates store data/configuration and references; they do not embed arbitrary user-submitted executable runtime code. Graph nodes and approved C# authoring operations can request creating an instance from a published TemplateId through the native validated spawn/instantiate gateway. They cannot directly modify the template library, replace published revisions or bypass admin/editor rights from a Player session.

Host-authoritative APIs: `TemplateCreateDraft`, `TemplateSaveDraft`, `TemplateCreateVariation`, `TemplateRename`, `TemplateTag`, `TemplateMoveFolder`, `TemplateDuplicate`, `TemplateArchive`, `TemplateRestore`, `TemplateDeleteUnreferenced`, `TemplateList/Search`, `TemplateWhereUsed`, `TemplateDiff`, `TemplatePublish`, `TemplateInstantiate` and `TemplateRebasePreview/Commit`. Creator-role capabilities and project ID checks protect every mutation. Error codes distinguish not-found, permission denied, conflict, referenced template, invalid parent, cycle, schema mismatch and release-pinned revision.

## Acceptance tests / handoff gates

1. Create a sword as ordinary object → Save as Template → close/reopen project → search and instantiate two independent sword instances.
2. Create NPC Guard template → child Guard Captain variation overriding patrol/appearance → update parent draft → verify child remains on pinned parent until explicit rebase.
3. Save custom component + C# graph-linked creature from Empty Custom → reopen → instantiate; actual script/graph linkage remains version-correct.
4. Save room, exit, merchant, inventory-bearing chest, vehicle, ability, weather and quest/event templates in same library; each maintains type-specific required fields.
5. Search 100,000 templates by name, tag, type, folder and capability with stable paging; rename while view open and verify updated index.
6. Rename template and folder; all ID references remain intact, existing instance name remains unchanged.
7. Bulk-tag, move group, archive/restore; published worlds and placed entities remain unchanged.
8. Try to delete referenced parent with child variations, quest or active world; show Where Used and deny destructive deletion.
9. Delete unreferenced draft after confirmation; verify no orphan metadata/index; undo via restored version/backups when policy allows.
10. Duplicate vs Create Variation yield visibly different lineage and behavior; cycle/depth/missing reference block publish.
11. Two editors save same draft revision; one receives revision conflict, no lost changes.
12. Backup/restore and cross-project import with ID remap, duplicate names and malicious executable asset references; preserve security and consistency.
13. Screen-reader, keyboard and touch interactions support create/save/rename/tag/group/delete without custom scripts.
