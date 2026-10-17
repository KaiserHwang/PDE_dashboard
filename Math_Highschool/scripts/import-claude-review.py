"""Claude CLI envelope에서 실제 응답만 보관한다. 계정/세션/비용 메타데이터는 제외."""
import argparse
import json
import re
from pathlib import Path
p = argparse.ArgumentParser()
p.add_argument('raw')
p.add_argument('output')
a = p.parse_args()
outer = json.loads(Path(a.raw).read_text())
result = outer.get('result', '')
fence = chr(96)*3
m = re.search(fence+r'(?:json)?\s*\n([\s\S]*?)'+fence, result)
try:
    data = json.JSONDecoder().raw_decode((m.group(1) if m else result[result.index('{'):]).lstrip())[0]
except (ValueError, json.JSONDecodeError):
    data = {'response':result}
Path(a.output).write_text(json.dumps({'reviewer':'Claude Code','model':next(iter(outer.get('modelUsage',{})), 'unknown'),'record':data}, ensure_ascii=False, indent=2)+'\n')
print(a.output)
