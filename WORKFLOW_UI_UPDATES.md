# Workflow UI Updates - Variable Association

## Overview

The Angular frontend has been updated to support variable association with CHOICE and INPUT steps, matching the backend capabilities demonstrated in the example JSON workflow.

## Changes Made

### 1. Updated TypeScript Models (`src/app/models/workflow.models.ts`)

**Added `ChoiceOption` interface:**
```typescript
export interface ChoiceOption {
  text: string;      // Display text shown to user
  value: string;     // Value stored in variable
  next_step?: string; // Optional next step for this option
}
```

**Updated `WorkflowStep` interface:**
```typescript
export interface WorkflowStep {
  // ... other fields
  options?: ChoiceOption[];  // Changed from string[] to ChoiceOption[]
  variable?: string;         // Already supported
  // ... other fields
}
```

### 2. Enhanced Step Editor Component

**Template Changes (`workflow-step-editor.component.html`):**

#### Added Variable Field for CHOICE Steps:
```html
<div *ngIf="stepType === StepType.CHOICE" class="form-group">
  <label for="choice-variable">Store Selection In Variable *</label>
  <input
    id="choice-variable"
    type="text"
    formControlName="variable"
    placeholder="e.g., company_size"
    class="form-input">
  <small class="help-text">The selected option's value will be stored in this variable</small>
</div>
```

#### Enhanced Choice Options with Labeled Fields:
```html
<div class="option-field-group">
  <label class="field-label">Display Text</label>
  <input formControlName="text" placeholder="e.g., 1-10 employees">
</div>
<div class="option-field-group">
  <label class="field-label">Stored Value</label>
  <input formControlName="value" placeholder="e.g., small">
</div>
<div class="option-field-group">
  <label class="field-label">Next Step</label>
  <select formControlName="next_step">...</select>
</div>
```

**TypeScript Changes (`workflow-step-editor.component.ts`):**

Updated required fields validation:
```typescript
isFieldRequired(stepType: string, fieldName: string): boolean {
  const requiredFields: Record<string, string[]> = {
    [StepType.MESSAGE]: ['content'],
    [StepType.CHOICE]: ['content', 'variable', 'options'],  // Added 'variable'
    [StepType.INPUT]: ['content', 'variable'],              // Added 'content'
    // ... other step types
  };
  return requiredFields[stepType]?.includes(fieldName) || false;
}
```

**Style Updates (`workflow-step-editor.component.scss`):**

Added improved styling for choice options:
- Individual option cards with white background
- Grid layout with labeled fields
- Better visual hierarchy with field labels
- Enhanced mobile responsiveness

### 3. Form Builder Support

The `workflow-create.component.ts` already properly handles:
- Variable field in step form (line 222)
- ChoiceOption objects with text, value, next_step (lines 207-213)
- Serialization to/from backend format

## Features Now Available

### ✅ CHOICE Steps
- **Variable Assignment**: Specify which variable stores the user's selection
- **Display Text**: User-friendly text shown in UI (e.g., "1-10 employees")
- **Stored Value**: Normalized value saved to variable (e.g., "small")
- **Option-Level Routing**: Each choice can route to a different next step
- **Validation**: Variable field is now required for CHOICE steps

### ✅ INPUT Steps
- **Variable Assignment**: Specify which variable stores the user's input
- **Content Prompt**: Message shown to user requesting input
- **Validation**: Both content and variable fields are required

### ✅ Visual Improvements
- Clearer field labels ("Display Text", "Stored Value", "Next Step")
- Help text explaining variable functionality
- Better organized layout with field grouping
- Enhanced mobile responsiveness

## Example Workflow Creation

When creating a workflow with the updated UI, users can now:

1. **Add a CHOICE step:**
   - Set "Store Selection In Variable": `company_size`
   - Add options with:
     - Display Text: "1-10 employees"
     - Stored Value: "small"
     - Next Step: "use_case"

2. **Add an INPUT step:**
   - Set "Content/Message": "What's your primary use case?"
   - Set "Store Response In Variable": `use_case`
   - Set "Next Step": "check_qualified"

3. **Add a CONDITION step:**
   - Set condition: `company_size != 'small'`
   - Route based on the variable value

4. **Add an ACTION step:**
   - Use variable interpolation: `{{company_size}}`, `{{use_case}}`
   - Variables are automatically replaced with actual values

## Backend Compatibility

These UI changes are fully compatible with the backend workflow format:

```json
{
  "id": "company_size",
  "type": "choice",
  "content": "What's your company size?",
  "variable": "company_size",
  "options": [
    {
      "text": "1-10 employees",
      "value": "small",
      "next_step": "use_case"
    }
  ]
}
```

## Testing Checklist

- [x] ChoiceOption interface defined in models
- [x] WorkflowStep.options uses ChoiceOption[]
- [x] Variable field added to CHOICE step UI
- [x] Field labels added to option fields
- [x] Help text added for variable field
- [x] Required field validation updated
- [x] Styling enhanced for better UX
- [x] Mobile responsiveness maintained
- [x] Form builder handles ChoiceOption objects
- [x] Serialization to backend format works

## Migration Notes

**For Existing Workflows:**

If you have old workflows with string options, the backend supports both formats:
- Old: `options: ["Small", "Medium", "Large"]`
- New: `options: [{text: "Small", value: "small", next_step: "..."}]`

The UI will create new workflows using the ChoiceOption format.

## Next Steps

The workflow creation UI now fully supports:
1. ✅ Variable declaration at workflow level
2. ✅ Variable association with CHOICE steps
3. ✅ Variable association with INPUT steps
4. ✅ Rich option objects with text, value, next_step
5. ✅ Visual feedback and validation

Users can now create workflows that match your example JSON snippet exactly!

## File Summary

**Modified Files:**
- `src/app/models/workflow.models.ts` - Added ChoiceOption interface
- `src/app/workflows/workflow-create/workflow-step-editor/workflow-step-editor.component.html` - Added variable field and enhanced option fields
- `src/app/workflows/workflow-create/workflow-step-editor/workflow-step-editor.component.ts` - Updated validation rules
- `src/app/workflows/workflow-create/workflow-step-editor/workflow-step-editor.component.scss` - Enhanced styling

**No Changes Needed:**
- `src/app/workflows/workflow-create/workflow-create.component.ts` - Already handles variable field and ChoiceOption objects correctly
