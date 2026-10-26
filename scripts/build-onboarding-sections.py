#!/usr/bin/env python3
"""Extract names only from the 24 source templates; never copy sample prices/options."""
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
sections = {}
for path in sorted((root / 'templates/business-types').glob('*.json')):
    template = json.loads(path.read_text())
    sections[template['id']] = [section['name'] for section in sorted(template['sections'], key=lambda section: section['sortOrder'])
                                if section['isDefaultVisible']]
assert len(sections) == 24 and all(sections.values())
(root / 'MenuMini_1/src/lib/onboarding/starting-sections.json').write_text(json.dumps(sections, ensure_ascii=False, indent=2) + '\n')
print('Extracted empty starting sections for 24 business types; no products or prices.')
