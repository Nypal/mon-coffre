# -*- coding: utf-8 -*-
"""
Inject mc_logic.js, the application logic and backend adapter, into the
locked design bundle.

The replacement is intentionally surgical: only the logic bytes change.
The visual template, runtime, and fonts remain byte-identical.
"""
import json

SRC = "Mon Coffre - Application.html"
OUT = "Mon Coffre - Application (backend).html"
LOGIC = "mc_logic.js"

raw = open(SRC, "r", encoding="utf-8").read()
logic = open(LOGIC, "r", encoding="utf-8").read()

START = "class Component extends DCLogic {"
CLOSE = "<\\u002Fscript>"      # escaped </script> as produced by the original encoder

rs = raw.find(START)
assert rs != -1, "start anchor not found"
re_ = raw.find(CLOSE, rs)
assert re_ != -1, "end anchor not found"

assert START in logic, "mc_logic.js must contain the Component class"
body = logic[logic.find(START):].rstrip() + "\n"


def escape_logic(s):
    # JSON escaping first, then "/" -> "\u002F" like the original encoder.
    # This guarantees no raw </script can appear inside the template.
    e = json.dumps(s, ensure_ascii=False)[1:-1]
    return e.replace("/", "\\u002F")


new_body = escape_logic(body)
new_raw = raw[:rs] + new_body + raw[re_:]
open(OUT, "w", encoding="utf-8").write(new_raw)

suffix = raw[re_:]
print("OK ->", OUT)
print("logic chars:", len(body))
print("prefix matches original:", raw[:rs] == new_raw[:rs])
print("suffix matches original:", new_raw[len(new_raw) - len(suffix):] == suffix)
print("no raw </script injected:", "</script" not in new_body)
