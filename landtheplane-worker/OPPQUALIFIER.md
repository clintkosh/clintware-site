# OppQualifier integration contract

OppQualifier is the LandThePlane acquisition and safety component for unsolicited recruiting engagements.

Canonical flow:

`Unsolicited outreach -> OppQualifier -> authenticated-path verification -> fit/pay qualification -> next qualifier -> save/continue in LandThePlane -> interview prep`

The standalone implementation is isolated from the current LandThePlane runtime. New qualification prompts must never shadow, replace, or drop the existing resume/job prep inputs. Future runtime integration should occur only after regression tests cover the current prep-map and Brief Builder.
