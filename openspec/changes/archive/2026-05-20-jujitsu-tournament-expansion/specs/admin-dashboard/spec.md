## ADDED Requirements

### Requirement: Results export splits files by category and tier for tournament events

For tournament events, the admin results export feature SHALL produce one Excel file and one PDF file per `(category, tier)` group. File names SHALL include both category and tier identifiers (e.g., `男子組_國小高年級.xlsx`, `女子組_公開組.pdf`). For sports-day events, the existing one-file-per-category behavior SHALL be preserved unchanged.

#### Scenario: Tournament event export produces per-group files

- **WHEN** admin clicks "匯出 Excel" for a tournament event containing teams in `(male, EH)`, `(male, JH)`, and `(female, OPEN)`
- **THEN** the system SHALL produce three separate Excel files, one for each `(category, tier)` group, and each file SHALL contain only the teams belonging to that group

##### Example: export file naming

| Event teams | Generated files |
| ----------- | --------------- |
| Tournament: male EH (3), male JH (4), female OPEN (2) | `男子組_國小高年級.xlsx`, `男子組_國高中.xlsx`, `女子組_公開組.xlsx` (3 files) |
| Tournament: male EL (1) only | `男子組_國小低年級.xlsx` (1 file) |
| Sports-day: male (5), female (3), mixed (2) | `男子組.xlsx`, `女子組.xlsx`, `混合組.xlsx` (3 files, existing behavior) |

#### Scenario: Sports-day export preserves existing naming

- **WHEN** admin clicks "匯出 Excel" for a sports-day event containing male, female, and mixed teams
- **THEN** the generated file names SHALL be `男子組.xlsx`, `女子組.xlsx`, `混合組.xlsx`, identical to pre-change behavior

### Requirement: Tournament export omits VR columns for elementary tier groups

For tournament event exports of elementary tier `(category, tier)` groups (EL, EM, EH), the generated Excel and PDF files SHALL omit all VR-related columns (VR_A, VR_B, VR_C, throwVariety, groundVariety). The grand total formula SHALL exclude any VR contribution.

#### Scenario: EL group export omits VR columns

- **WHEN** admin exports results for a tournament event and the resulting `男子組_國小低年級.xlsx` is opened
- **THEN** the file SHALL NOT contain any column with `VR` in its header, and the grand total cell SHALL sum only motion subtotals

#### Scenario: JH group export retains VR columns

- **WHEN** admin exports results for a tournament event and the resulting `男子組_國高中.xlsx` is opened
- **THEN** the file SHALL contain VR_A, VR_B, VR_C columns and the grand total SHALL include VR contributions (existing behavior preserved for JH and OPEN)
