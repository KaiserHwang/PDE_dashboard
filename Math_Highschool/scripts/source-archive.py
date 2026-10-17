from pathlib import Path
import zipfile
root=Path(__file__).resolve().parents[1]
with zipfile.ZipFile(root/'dist/source.zip','w',zipfile.ZIP_DEFLATED) as z:
    for name in ['src','scripts','tests','docs']:
        for path in sorted((root/name).rglob('*')):
            if path.is_file() and '__pycache__' not in path.parts:
                z.write(path,path.relative_to(root))
    for name in ['README.md','package.json','package-lock.json','.gitignore']:
        if (root/name).exists():
            z.write(root/name,name)
