## MODIFIED Requirements

### Requirement: PART score display above player card

The audience display SHALL render each player's P1/P2/P3 IPPON indicators as three vertically-stacked circular lights. Each circle SHALL display its label (P1, P2, or P3) centered inside the circle. A circle SHALL appear lit (yellow) when its IPPON count is greater than zero, and unlit (dark) when the count is zero. There SHALL be no outer rectangular border or container wrapping the three circles.

#### Scenario: All IPPON counts are zero

- **WHEN** a player's P1, P2, and P3 counts are all 0
- **THEN** all three circles SHALL appear unlit with dark background (`bg-white/10`) and muted label text (`text-white/30`)

#### Scenario: IPPON count becomes greater than zero

- **WHEN** a player's IPPON count for any part increases from 0 to 1 or more
- **THEN** the corresponding circle SHALL appear lit with yellow background (`bg-yellow-400`) and dark label text (`text-yellow-900`)

#### Scenario: IPPON count increases by 1 (flash animation)

- **WHEN** a player's IPPON count for any part increases by 1 (regardless of previous value)
- **THEN** the corresponding circle SHALL play a flash animation for approximately 600–700ms AND SHALL remain lit (yellow) after the animation completes

#### Scenario: Circles scale responsively

- **WHEN** the audience display is viewed on screens of different sizes
- **THEN** the circle diameter SHALL be `w-10 h-10` on small screens, `w-14 h-14` on md, `w-16 h-16` on lg, and `w-20 h-20` on xl and above
