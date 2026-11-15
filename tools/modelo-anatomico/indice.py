import glob
import os
import sys

d, out = sys.argv[1], sys.argv[2]
with open(out, "w", encoding="utf-8") as o:
    for f in sorted(glob.glob(os.path.join(d, "*.obj"))):
        name = bounds = vol = ""
        with open(f, encoding="utf-8", errors="replace") as h:
            for i, l in enumerate(h):
                if i > 16: break
                if "English name" in l: name = l.split(":", 1)[1].strip()
                if "Bounds" in l: bounds = l.split(":", 1)[1].strip()
                if "Volume" in l: vol = l.split(":", 1)[1].strip()
        o.write(f"{os.path.basename(f)[:-4]}\t{name}\t{bounds}\t{vol}\t{os.path.getsize(f)}\n")
