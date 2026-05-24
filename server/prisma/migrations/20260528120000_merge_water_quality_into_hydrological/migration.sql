-- Merge Water Quality ERP department into Hydrological Services Department.

UPDATE "User"
SET department = 'hydrological'
WHERE department = 'water_quality';

UPDATE finance_budgets
SET department = 'hydrological'
WHERE lower(trim(department)) IN ('water_quality', 'water quality');

UPDATE finance_requisitions
SET department = 'hydrological'
WHERE lower(trim(department)) IN ('water_quality', 'water quality');
