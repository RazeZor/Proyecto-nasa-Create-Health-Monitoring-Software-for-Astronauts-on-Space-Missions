import os
import shutil
import sys
import zipfile

for ruta in sys.argv[1:]:
    tmp = ruta + ".tmp"
    with zipfile.ZipFile(ruta) as zin, zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            if item.filename.endswith("/"):
                continue
            zout.writestr(item, zin.read(item.filename))
    shutil.move(tmp, ruta)
    print("limpio", os.path.basename(ruta))
