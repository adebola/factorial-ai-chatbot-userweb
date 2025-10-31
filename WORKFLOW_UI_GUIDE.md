# Workflow UI Guide - Creating Workflows with Variables

## Overview

This guide shows how to create workflows with variable capture using the updated ChatCraft UI.

## Creating a Lead Qualification Workflow

### Step 1: Basic Information

1. Navigate to **Workflows** → **Create Workflow**
2. Fill in basic details:
   - **Name**: "Lead Qualification"
   - **Description**: "Qualify leads and collect information"
   - **Trigger Type**: "Message Keywords"
   - **Keywords**: Add "pricing", "demo"

### Step 2: Define Variables

In the **Variables** section, click "Add Variable" for each:

| Variable Name | Initial Value | Type   |
|--------------|---------------|--------|
| company_size | ""            | string |
| use_case     | ""            | string |
| email        | ""            | string |
| qualified    | false         | boolean|

### Step 3: Create Workflow Steps

#### Step 1: Greeting Message
- **Type**: Message
- **Name**: "greeting"
- **Content**: "I'd love to help! Let me ask a few questions."
- **Next Step**: company_size

---

#### Step 2: Company Size (CHOICE Step with Variable)
- **Type**: Choice
- **Name**: "company_size"
- **Content**: "What's your company size?"
- **Store Selection In Variable**: `company_size` ⭐ *NEW FIELD*

**Options:** (Each option has 3 fields now)

| Display Text | Stored Value | Next Step |
|-------------|--------------|-----------|
| 1-10 employees | small | use_case |
| 11-50 employees | medium | use_case |
| 51-200 employees | large | use_case |
| 200+ employees | enterprise | use_case |

**How it works:**
- User sees: "1-10 employees"
- System stores: `company_size = "small"`
- Workflow routes to: "use_case" step

---

#### Step 3: Use Case (INPUT Step with Variable)
- **Type**: Input
- **Name**: "use_case"
- **Content**: "What's your primary use case?"
- **Store Response In Variable**: `use_case` ⭐
- **Next Step**: check_qualified

**How it works:**
- User types: "We need better customer support"
- System stores: `use_case = "We need better customer support"`

---

#### Step 4: Check Qualified (CONDITION Step)
- **Type**: Condition
- **Name**: "check_qualified"
- **Condition**: `company_size != 'small'`
- **If True, go to**: collect_email
- **If False**: End workflow

**How it works:**
- If `company_size = "small"`: Workflow ends
- If `company_size = "medium"`, "large", or "enterprise"`: Continue to email collection

---

#### Step 5: Collect Email (INPUT Step)
- **Type**: Input
- **Name**: "collect_email"
- **Content**: "Great! What's your email?"
- **Store Response In Variable**: `email` ⭐
- **Next Step**: send_info

---

#### Step 6: Send Info (ACTION Step with Variable Interpolation)
- **Type**: Action
- **Name**: "send_info"
- **Action Type**: Send Email
- **Parameters**:
  - **To**: `{{email}}` ⭐
  - **Subject**: `Pricing for {{company_size}} companies` ⭐
  - **Body**: `Thanks for your interest in {{use_case}}!` ⭐
- **Next Step**: (End workflow)

**How it works:**
- `{{email}}` → Replaced with actual email address
- `{{company_size}}` → Replaced with "medium", "large", etc.
- `{{use_case}}` → Replaced with user's input

---

## UI Features

### CHOICE Step - Enhanced Options

```
┌─────────────────────────────────────────────────────────────┐
│ Store Selection In Variable *                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ company_size                                            │ │
│ └─────────────────────────────────────────────────────────┘ │
│ The selected option's value will be stored in this variable │
│                                                              │
│ Choice Options *                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ DISPLAY TEXT         STORED VALUE      NEXT STEP      │ │
│ │ ┌─────────────────┐ ┌──────────────┐ ┌─────────────┐ │ │
│ │ │1-10 employees   │ │ small        │ │ use_case ▼  │ │ │
│ │ └─────────────────┘ └──────────────┘ └─────────────┘ │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ [+] Add Option                                               │
└─────────────────────────────────────────────────────────────┘
```

### INPUT Step - Variable Field

```
┌─────────────────────────────────────────────────────────────┐
│ Content/Message *                                            │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ What's your primary use case?                           │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ Store Response In Variable *                                 │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ use_case                                                │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ Next Step                                                    │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ check_qualified                                      ▼  │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Key Improvements

### Before (Old UI)
- CHOICE options: Single text field only
- No variable association visible
- Unclear what value gets stored
- No per-option routing

### After (New UI)
- CHOICE options: Three fields per option
  - **Display Text**: What user sees
  - **Stored Value**: What system stores
  - **Next Step**: Where to route
- Variable field clearly visible
- Help text explains functionality
- Each option can route differently

## Variable Usage Patterns

### 1. Storing User Choices
```
Variable: company_size
User selects: "51-200 employees"
Stored value: "large"
```

### 2. Storing User Input
```
Variable: email
User types: "user@example.com"
Stored value: "user@example.com"
```

### 3. Using in Conditions
```
Condition: company_size != 'small'
Evaluates: "large" != "small" → true → Go to next step
```

### 4. Using in Messages/Actions
```
Template: "Pricing for {{company_size}} companies"
Output: "Pricing for large companies"
```

## Best Practices

### Variable Naming
✅ Good:
- `company_size`
- `user_email`
- `is_qualified`

❌ Avoid:
- `var1`, `temp`
- `CompanySize` (use snake_case)
- Variables with spaces

### Stored Values
✅ Good:
- `small`, `medium`, `large` (normalized)
- `true`, `false` (for booleans)
- Short, meaningful codes

❌ Avoid:
- `"1-10 employees"` (too long, has spaces)
- Display text as stored value

### Option Routing
Each option can have its own next step:
```
"Yes" → confirmation_step
"No" → cancellation_step
"Maybe" → follow_up_step
```

## Testing Your Workflow

1. **Save as Draft** - Review and edit
2. **Activate** - Make it live
3. **Test** - Send test messages with trigger keywords
4. **Monitor** - Check Workflow Executions tab
5. **View Variables** - See captured values in execution details

## Troubleshooting

### Variables Not Capturing
- ✅ Ensure variable field is filled in for CHOICE/INPUT steps
- ✅ Check variable name matches exactly (case-sensitive)
- ✅ Verify step is actually executed in workflow

### Condition Not Working
- ✅ Use correct operator: `!=`, `==`, `>`, `<`, `>=`, `<=`
- ✅ Match stored value, not display text: `'small'` not `'1-10 employees'`
- ✅ Use quotes for string values: `'small'` not `small`

### Variables Not Interpolating
- ✅ Use double braces: `{{variable}}` not `{variable}`
- ✅ Ensure variable was captured in earlier step
- ✅ Check variable name spelling

## Summary

The workflow UI now fully supports:
- ✅ Variable capture from user choices (CHOICE steps)
- ✅ Variable capture from user input (INPUT steps)
- ✅ Rich choice options (text, value, next_step)
- ✅ Conditional branching based on variables
- ✅ Variable interpolation in messages and actions
- ✅ Clear visual indicators and help text
- ✅ Validation for required fields

This matches the backend JSON workflow format exactly!
