---
name: Component Architecture & Refinement
description: Standards for React component size, separation of concerns, and logic extraction.
---

# Component Architecture & Refinement

This skill defines the standards for maintaining manageable and testable React components.

## Core Rules

- **Line Count Limit**: Prefer keeping components under **150 lines**. 
- **Evaluation Criteria**: If a component exceeds 150 lines, do not split blindly. Evaluate the code for distinct concerns:
    - **Data Fetching**: API calls and Supabase logic.
    - **Sub-UI Sections**: Large chunks of JSX that represent a logically separate part of the interface (e.g., a specific list, a complex form section).
    - **Reusable Logic**: Calculations or state transformations that could benefit other parts of the app.
- **Logic Extraction**: Always extract stateful logic (complex `useState`, `useEffect` chains) into **custom hooks**.
- **Natural Boundaries**: Split only at natural boundaries of responsibility. Never split code purely to satisfy a line count if it makes the logic harder to follow.
