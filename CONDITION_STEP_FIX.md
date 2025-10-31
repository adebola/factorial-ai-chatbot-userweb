# Condition Step Dropdown Fix

## Problem

The condition step had a form structure mismatch causing dropdown selections not to save:

### Root Cause
1. **Parent form** defined `condition` as a **simple FormControl (string)**
2. **Step editor component** tried to create `condition` as a **nested FormGroup** with multiple fields
3. **Template** used `formGroupName="condition"` expecting the nested group
4. Angular couldn't bind the dropdowns because the parent form had a FormControl instead of FormGroup

### Symptom
When selecting a step in the "If True, go to:" or "If False, go to:" dropdowns, the selection wouldn't stick - the dropdown would appear empty.

## Solution

Simplified the CONDITION step UI to align with the backend schema:

### Backend Schema
```typescript
{
  condition: string;     // Expression like "company_size != 'small'"
  next_step: string;     // Step ID for TRUE branch
  // No false_step support - workflow ends if FALSE
}
```

### Changes Made

#### 1. TypeScript Component (`workflow-step-editor.component.ts`)

**Removed:**
- `ensureConditionFields()` method - no longer needed
- `conditionGroup` getter - no longer needed
- `conditionOperators` array - no longer used
- CONDITION case from `onStepTypeChange()` switch

**Updated:**
- `isFieldRequired()`: Added 'next_step' as required for CONDITION steps

#### 2. HTML Template (`workflow-step-editor.component.html`)

**Before:**
```html
<div formGroupName="condition">
  <input formControlName="variable">
  <select formControlName="operator">...</select>
  <input formControlName="value">
  <select formControlName="true_step">...</select>
  <select formControlName="false_step">...</select>
</div>
```

**After:**
```html
<textarea formControlName="condition"
  placeholder="e.g., company_size != 'small'">
</textarea>
<!-- Use existing next_step dropdown (if TRUE) -->
<select formControlName="next_step">...</select>
```

## New UI Behavior

### CONDITION Step Fields

1. **Condition Expression** (textarea, required)
   - Direct string input
   - Example: `company_size != 'small'`
   - Supports: `==`, `!=`, `>`, `<`, `>=`, `<=`

2. **Next Step (if condition is TRUE)** (dropdown, required)
   - Select from available steps
   - Executes if condition evaluates to TRUE

3. **If condition is FALSE**
   - Workflow ends automatically
   - No separate dropdown needed

### Example Usage

```
Step: check_qualified
Type: CONDITION
Condition Expression: company_size != 'small'
Next Step (if TRUE): collect_email

Flow:
- If company_size is "medium", "large", or "enterprise" → Goes to collect_email
- If company_size is "small" → Workflow ends
```

## Benefits

✅ **Fixed dropdown binding issue** - Selections now save correctly
✅ **Simpler UI** - One textarea + one dropdown instead of complex nested form
✅ **Matches backend schema** - No transformation needed
✅ **More flexible** - Users can write any valid condition expression
✅ **Clear expectations** - Help text explains FALSE behavior

## Testing

Build successful: ✅
```bash
npm run build
# Application bundle generation complete
```

### Test Case: Create CONDITION Step

1. Add a CONDITION step to a workflow
2. Enter condition: `variable_name != 'value'`
3. Select "Next Step (if TRUE)" from dropdown
4. ✅ Selection saves correctly
5. ✅ Form validation works
6. ✅ Workflow can be saved

## Migration Notes

**For Existing Workflows:**

If any workflows were created with the old nested condition structure, they may need to be recreated or migrated. The backend has always expected the simple structure, so existing workflows in the database should already be in the correct format.

**Old UI attempted to create:**
```json
{
  "condition": {
    "variable": "company_size",
    "operator": "not_equals",
    "value": "small",
    "true_step": "collect_email",
    "false_step": ""
  }
}
```

**Backend expects (and now UI creates):**
```json
{
  "condition": "company_size != 'small'",
  "next_step": "collect_email"
}
```

## Files Modified

1. `src/app/workflows/workflow-create/workflow-step-editor/workflow-step-editor.component.ts`
   - Removed: `ensureConditionFields()`, `conditionGroup`, `conditionOperators`
   - Updated: `onStepTypeChange()`, `isFieldRequired()`

2. `src/app/workflows/workflow-create/workflow-step-editor/workflow-step-editor.component.html`
   - Replaced: Nested condition form with simple textarea
   - Updated: Next step dropdown to show for CONDITION steps

## Related Documentation

- Backend workflow schema: `workflow-service/app/schemas/workflow_schema.py`
- Workflow example: `workflow-service/app/services/workflow_parser.py` (EXAMPLE_LEAD_QUALIFICATION)
- Variable guide: `VARIABLE_WORKFLOW_GUIDE.md`
