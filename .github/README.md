# Buzeye CRM - GitHub Copilot Agent Configuration

This directory contains custom GitHub Copilot agent configurations for the Buzeye CRM project.

## Overview

The agent configuration helps GitHub Copilot understand the Buzeye CRM codebase, architecture, and conventions to provide better code suggestions and assistance.

## Structure

```
.github/
├── README.md                                  # This file
├── copilot-instructions.md                    # Workspace-level instructions (always active)
├── agents/
│   └── buzeye-crm.agent.md                   # Specialized CRM development agent
└── instructions/
    ├── backend-controllers.instructions.md    # Backend API development patterns
    ├── frontend-components.instructions.md    # React component development patterns
    └── database-schema.instructions.md        # Database schema and migration patterns
```

## Files

### `copilot-instructions.md`
**Workspace-level instructions** - Always active for all Copilot interactions in this workspace.

Contains:
- Product overview and business context
- Complete technology stack details
- Multi-tenant architecture patterns
- API routing conventions
- Database schema patterns
- Code organization and file structure
- AI assistant and WhatsApp integration details
- Development workflow (local → git → deploy)
- Production environment setup
- Coding standards and best practices
- Security requirements
- Testing guidelines
- Common tasks and approaches
- Indian market-specific patterns

This is the **primary reference** for all development work in Buzeye CRM.

### `agents/buzeye-crm.agent.md`
**Custom agent** - Specialized agent for CRM development tasks.

Invoke when working on:
- Implementing new CRM features
- Debugging multi-tenant issues
- AI/WhatsApp integration work
- Database migrations
- Hindi/Hinglish language features
- GST compliance features
- Udhar Khata (credit ledger) logic

This agent has deep expertise in Indian SMB workflows, mobile-first design, and production deployment.

### `instructions/backend-controllers.instructions.md`
**File-specific instructions** - Automatically applied when working on backend controller files.

Applies to: `backend/controllers/**/*.js`

Enforces:
- Consistent controller structure and error handling
- Database query patterns with parameterized queries
- Authentication and authorization patterns
- Input validation standards
- API response format conventions
- Hindi/Hinglish support in controllers
- Security best practices
- Performance optimization patterns

### `instructions/frontend-components.instructions.md`
**File-specific instructions** - Automatically applied when working on React components.

Applies to: `frontend/src/**/*.jsx`

Enforces:
- React component structure with hooks
- Mobile-first responsive design patterns
- TailwindCSS conventions and Buzeye brand colors
- API integration with error handling
- Form handling and validation
- Hindi/Hinglish UI support
- Indian format handling (currency, phone, dates)
- Performance optimization (memoization, lazy loading)
- Accessibility standards
- Common component patterns (modals, lists, search)

### `instructions/database-schema.instructions.md`
**File-specific instructions** - Automatically applied when working on SQL files.

Applies to: `database/**/*.sql`

Enforces:
- Migration file naming and structure
- Safe, idempotent migration patterns
- PostgreSQL best practices
- Multi-tenant schema patterns
- Index creation strategies
- View and materialized view patterns
- Constraint and validation patterns
- Trigger and function patterns
- Indian-specific data patterns (GST, phone numbers)
- Performance optimization
- Production safety checklists

## How It Works

### Workspace Instructions (Always On)
When you open this workspace in VS Code with GitHub Copilot:
- `copilot-instructions.md` is automatically loaded
- Provides context for all Copilot interactions
- No need to manually reference it

### File Instructions (Auto-Applied)
When you edit files matching the `applyTo` pattern:
- Relevant instructions are automatically loaded
- E.g., editing `backend/controllers/customerController.js` loads `backend-controllers.instructions.md`
- Provides file-specific best practices and patterns

### Custom Agent (On-Demand)
When you need specialized CRM development help:
- Type `/` in Copilot chat to see available agents
- Select `buzeye-crm` agent for specialized assistance
- Agent has deep CRM-specific knowledge

## Usage Examples

### General Development
Just code normally - `copilot-instructions.md` is always active providing context.

### Creating a New API Endpoint
1. Open `backend/controllers/newController.js`
2. `backend-controllers.instructions.md` automatically applies
3. Copilot suggests code following the controller pattern
4. Error handling, validation, and response format are enforced

### Building a React Component
1. Open `frontend/src/components/NewComponent.jsx`
2. `frontend-components.instructions.md` automatically applies
3. Copilot suggests mobile-first, TailwindCSS-styled components
4. Hindi/Hinglish support and Indian formats are considered

### Writing a Database Migration
1. Create `database/migrations/007_new_feature.sql`
2. `database-schema.instructions.md` automatically applies
3. Copilot suggests safe, idempotent migration patterns
4. Multi-tenant considerations are included

### Complex CRM Task
1. Open Copilot chat
2. Type `/buzeye-crm` to invoke the specialized agent
3. Ask for help with multi-tenant features, AI integration, etc.
4. Agent provides expert guidance

## Best Practices

### For Developers

1. **Read the workspace instructions first**
   - Review `copilot-instructions.md` to understand the project
   - Reference `agent.md` (project root) for operational details

2. **Follow the patterns**
   - File instructions enforce tested patterns
   - Match existing code style and conventions
   - Use auto-suggestions as guides

3. **Test your code**
   - Local testing before pushing
   - Follow the development workflow
   - Verify on mobile devices

4. **Update documentation**
   - If you make architectural changes, update these files
   - Keep patterns current with the codebase

### For Updating Agent Configuration

1. **When to update `copilot-instructions.md`**
   - Major architectural changes
   - New integrations or tech stack changes
   - Updated deployment processes
   - New business rules or constraints

2. **When to update file instructions**
   - New coding patterns emerge
   - Common mistakes identified
   - Best practices evolve
   - New libraries or frameworks adopted

3. **When to create new instructions**
   - New file type or pattern emerges
   - Specific domain needs targeted guidance
   - Repeated mistakes in specific areas

4. **Keep it current**
   - Review quarterly or after major releases
   - Remove outdated patterns
   - Add lessons learned from production issues

## Additional Resources

- [GitHub Copilot Documentation](https://docs.github.com/en/copilot)
- [VS Code Copilot Extensions](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot)
- Project documentation in `/docs` (if exists)
- `README.md` at project root
- `ARCHITECTURE.md` for system design details

## Troubleshooting

### Copilot not using instructions
1. Ensure you're in the workspace (not just a folder)
2. Reload VS Code window
3. Check file patterns in `applyTo` field
4. Verify YAML frontmatter syntax

### Conflicting suggestions
1. File instructions take precedence over workspace instructions
2. More specific patterns override general patterns
3. You can always override suggestions manually

### Instructions not loading
1. Check for YAML frontmatter errors
2. Ensure file is in `.github/` directory
3. File must have correct extension (`.md`)
4. Restart Copilot: CMD+Shift+P → "Reload Copilot"

## Contributing

When contributing to Buzeye CRM:
1. Review these agent configurations first
2. Follow the established patterns
3. Test locally before pushing
4. Update agent config if introducing new patterns
5. Document significant architectural decisions

---

**Note:** This agent configuration is part of the Buzeye CRM codebase. It evolves with the project and should be kept in sync with actual code patterns and practices.

For questions about agent configuration, ask in team chat or review GitHub Copilot documentation.
