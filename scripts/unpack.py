"""Build the static website from the repository's uploaded ZIP."""
from pathlib import Path, PurePosixPath
import shutil
import stat
import zipfile

ROOT = Path(__file__).resolve().parents[1]
ARCHIVE = ROOT / 'KLA_Practice_Lab_GitHub_Repo.zip'
DEST = ROOT / 'build'

def main():
    with zipfile.ZipFile(ARCHIVE) as archive:
        entries = archive.infolist()
        for entry in entries:
            path = PurePosixPath(entry.filename)
            if path.is_absolute() or '..' in path.parts or '\\' in entry.filename:
                raise ValueError('Unsafe archive path')
            if stat.S_ISLNK(entry.external_attr >> 16):
                raise ValueError('Archive symlinks are unsupported')
        if DEST.exists():
            shutil.rmtree(DEST)
        DEST.mkdir()
        archive.extractall(DEST)
    if not (DEST / 'site' / 'index.html').is_file():
        raise ValueError('The ZIP must contain site/index.html at its root')
    from add_solutions_page import install
    install(DEST / 'site')
    print('Website unpacked into build/site with Solutions audit tab')

if __name__ == '__main__':
    main()
