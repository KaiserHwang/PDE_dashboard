"""CI: Git 추적 파일과 완성된 수학 앱 정적 산출물만 Pages로 묶는다."""
import argparse
import shutil
import subprocess
from pathlib import Path
p = argparse.ArgumentParser()
p.add_argument('--repo', required=True)
p.add_argument('--output', required=True)
a = p.parse_args()
repo = Path(a.repo).resolve()
out = Path(a.output).resolve()
if out == repo or out in repo.parents:
    raise SystemExit('output must be a separate child directory')
out.mkdir(parents=True, exist_ok=True)
files = subprocess.check_output(['git', 'ls-files', '-z'], cwd=repo).decode().split('\0')
for name in files:
    if not name or name.startswith(('.github/', '.openai/')):
        continue
    source = repo / name
    if source.is_file() and not source.is_symlink():
        target = out / name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
for source in (repo / 'Math_Highschool' / 'dist').iterdir():
    if source.is_file():
        target = out / 'Math_Highschool' / source.name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
