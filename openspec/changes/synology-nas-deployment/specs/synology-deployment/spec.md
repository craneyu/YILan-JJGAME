## ADDED Requirements

### Requirement: Synology NAS deployment package can be built from Mac

The system SHALL provide a `package-synology.sh` script on the Mac that exports the three Docker images (frontend, backend, mongo) as separate `.tar` files and packages them with the NAS-specific `docker-compose.yml` into a single `.zip` archive.

#### Scenario: Admin runs packaging script

- **WHEN** admin runs `./package-synology.sh` on Mac after building Docker images
- **THEN** the script SHALL create a `synology-YYYYMMDD-HHMM.zip` file
- **THEN** the zip SHALL contain `frontend.tar`, `backend.tar`, `mongo.tar`, and `docker-compose.yml`

### Requirement: MongoDB memory usage is bounded on 2GB NAS

The NAS `docker-compose.yml` SHALL configure MongoDB with `--wiredTigerCacheSizeGB 0.25` and `mem_limit: 512m` to prevent out-of-memory conditions on 2GB RAM hardware.

#### Scenario: MongoDB starts with memory limits

- **WHEN** the Container Manager project starts on a 2GB NAS
- **THEN** MongoDB SHALL use no more than 512MB of RAM
- **THEN** the WiredTiger cache SHALL be limited to 256MB

### Requirement: System can be deployed via Synology Container Manager GUI without SSH

The system SHALL be deployable entirely through the Synology Container Manager GUI — importing images via the Images tab and creating a project via the Project tab — without requiring SSH access.

#### Scenario: Admin imports images via GUI

- **WHEN** admin uploads the zip to NAS via File Station and extracts it
- **THEN** admin SHALL be able to import each `.tar` file via Container Manager → Images → Add → Import
- **THEN** all three images SHALL appear in the image list after import

#### Scenario: Admin creates project via GUI

- **WHEN** all three images are imported
- **THEN** admin SHALL be able to create a Container Manager Project pointing to the folder containing `docker-compose.yml`
- **THEN** the project SHALL start all three services successfully

### Requirement: Operations manual covers full lifecycle in Traditional Chinese

The `synology/MANUAL.md` SHALL document in Traditional Chinese the complete operational lifecycle: initial setup, daily start/stop, data backup, and updating to a new version.

#### Scenario: Admin follows manual for initial setup

- **WHEN** admin follows the manual step-by-step for the first time
- **THEN** admin SHALL be able to complete image import and project creation using only the Container Manager GUI
- **THEN** the system SHALL be accessible at `http://<NAS-IP>:4200`
