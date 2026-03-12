## ADDED Requirements

### Requirement: Match list grouped by category and weight class

The fighting-referee and ne-waza-referee components SHALL display the match list grouped by category (male/female/mixed) and then by weight class within each category. Matches within each weight class group SHALL be sorted by `scheduledOrder` ascending.

#### Scenario: Groups appear in correct category order

- **WHEN** the match list is loaded with matches of multiple categories
- **THEN** male group SHALL appear first, female group second, mixed group third

#### Scenario: Weight classes appear in spec-defined order

- **WHEN** matches with multiple weight classes exist within a category
- **THEN** weight classes SHALL appear in the fixed order defined by the official weight class specification (e.g., -56, -62, -69, -77, -85, -94, +94 for male)

#### Scenario: Matches within a weight class are sorted by scheduledOrder

- **WHEN** multiple matches exist in the same category and weight class
- **THEN** they SHALL be displayed in ascending `scheduledOrder`

#### Scenario: Unknown weight class appears last

- **WHEN** a match has a `weightClass` value not found in the fixed order table
- **THEN** it SHALL be appended after all known weight classes within its category group

#### Scenario: Empty category is not shown

- **WHEN** no matches exist for a category
- **THEN** that category group header SHALL NOT be rendered

### Requirement: Group headers display category and weight class labels

The list view SHALL render a category section header for each category group and a weight class sub-header for each weight class group.

#### Scenario: Category header displays Chinese label

- **WHEN** a category group is rendered
- **THEN** the header SHALL display the Chinese label: male → "男子組", female → "女子組", mixed → "混合組"

#### Scenario: Weight class sub-header displays weight class string

- **WHEN** a weight class group is rendered
- **THEN** the sub-header SHALL display the `weightClass` string value (e.g., "-56 公斤級")
