## MODIFIED Requirements

### Requirement: Admin can export creative embu results

The admin SHALL be able to export results for creative events. Two export formats SHALL be supported:
- **Excel (.xlsx)**: Per-category sheet with rank, team name, members, technicalTotal, artisticTotal, grandTotal, penaltyDeduction, finalScore, and a dedicated "扣分原因" column. The "扣分原因" column SHALL display comma-separated deduction entries (e.g., "超時 -1.0、使用道具 -1.0") when `penaltyDeduction > 0`, and SHALL be empty when there are no deductions.
- **PDF**: Per-category printable format with all teams ranked, chief judge signature area, A4 landscape orientation. When a team has `penaltyDeduction > 0`, the deduction cell SHALL display the amount followed by the deduction reasons in parentheses (e.g., `-2.0 (超時, 使用道具)`).

Abstained teams (where `isAbstained === true`) SHALL appear in the export with a "棄權" note in the rank column and a dash (`—`) in all score columns.

#### Scenario: Admin exports Excel for creative event

- **WHEN** the admin clicks the Excel export button for a creative event category
- **THEN** the system SHALL download an `.xlsx` file with the category's ranked results including all score fields and a "扣分原因" column

#### Scenario: Excel export includes deduction reasons for penalized teams

- **WHEN** a team in the exported category has `penaltyDeduction > 0` with violation types recorded in `CreativePenalty`
- **THEN** the "扣分原因" cell for that team's row SHALL contain a text description of each violation type and its deduction amount (e.g., "超時 -1.0、使用道具 -1.0")

#### Scenario: Excel export shows empty deduction reason for clean teams

- **WHEN** a team has no violations (`penaltyDeduction === 0`)
- **THEN** the "扣分原因" cell SHALL be empty

#### Scenario: Admin exports PDF for creative event

- **WHEN** the admin clicks the PDF export button for a creative event category
- **THEN** the system SHALL download an A4 landscape PDF with ranked teams and a signature area

#### Scenario: PDF export shows deduction reason inline

- **WHEN** a team has `penaltyDeduction > 0` in the PDF export
- **THEN** the deduction amount SHALL be followed by parenthesized reason text (e.g., `-2.0 (超時, 使用道具)`)

#### Scenario: Abstained teams appear in export with special notation

- **WHEN** an abstained team is included in the export
- **THEN** its rank column SHALL display "棄權" and all score columns SHALL display "—"
