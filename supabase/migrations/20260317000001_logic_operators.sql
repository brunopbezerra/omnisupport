-- Extend form_logic operator constraint to support numeric comparisons
ALTER TABLE form_logic
  DROP CONSTRAINT IF EXISTS form_logic_operator_check,
  ADD CONSTRAINT form_logic_operator_check
    CHECK (operator IN ('equals', 'not_equals', 'contains', 'greater_than', 'less_than'));
