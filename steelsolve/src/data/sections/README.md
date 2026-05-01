# SteelSolve Section Data

SteelSolve uses editable CSV files as the source of truth for European/METU steel section data.

## Workflow

1. Edit CSV files in `src/data/sections/source/`.
2. Run `npm run build:sections` from the `steelsolve` directory.
3. The generator writes `src/data/sections/generated/sections.json`.
4. The React app imports the generated JSON. It does not read CSV files or PDFs at runtime.

## Units

Source table values are kept in their original columns and also normalized for app use.

- `cm2` to `mm2`: multiply by `100`
- `cm3` to `mm3`: multiply by `1000`
- `cm4` to `mm4`: multiply by `10000`
- `cm` to `mm`: multiply by `10`
- `mm` stays `mm`
- `kg/m` stays `kg/m`

## Verification Policy

Every generated row currently has `verified: false`.

Rows should remain unverified until manually checked against the source section table. Do not use unverified rows for engineering calculations. In the current SteelSolve stage, section data is used for problem description only.

## Partial Fields

The I-shape and UPN source rows include the common course table properties that were text-extracted cleanly from the PDF. Angle rows currently keep geometry, area, and centroid values for the picker/readout. Angle inertia and principal-axis fields are intentionally left blank where the extracted table header/value mapping is not yet manually checked.
