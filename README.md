# XRP Blocky

Scratch/SPIKE-stílusú blokkos programozás az [XRP robothoz](https://experientialrobotics.org), böngészőből, Bluetooth-tal.

- **Blokkok** Scratch 3 kinézettel: események, mozgás, motorok, fény, hang, érzékelők, vezérlés, műveletek, változók
- **Python-nézet**: a blokkokból élőben készülő MicroPython kód (XRPLib)
- **Műszerfal**: akku (%, V), távolság, vonalérzékelők, IMU, kerékhelyzetek, élőben
- **Programhelyek** (0–9): az Indítás a kiválasztott helyre menti a programot; bekapcsolás után a robot gombja is elindítja
- **Vezetés**: képernyős joystick
- **Magyar / angol** felület, világos és sötét mód, telepíthető PWA
- **Demó robot** hardver nélküli kipróbáláshoz

## Melyik eszközön működik?

| Eszköz | Böngésző |
|---|---|
| Mac, Windows, Chromebook | Chrome vagy Edge |
| Android | Chrome |
| iPad / iPhone | [Bluefy](https://apps.apple.com/app/bluefy-web-ble-browser/id1492822055) (a Safari nem támogatja a Web Bluetooth-t) |

Később Capacitorral natív iPad-app is készülhet ugyanebből a kódból.

## Fejlesztés

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tesztek
npm run build      # dist/
```

A Web Bluetooth csak HTTPS-en vagy `localhost`-on működik.

## Közzététel

A `main` ágra pusholt minden változás GitHub Pages-re kerül (`.github/workflows/deploy.yml`).
Első alkalommal a repó **Settings → Pages → Source** beállításánál válaszd a **GitHub Actions** lehetőséget.

## Hogyan beszél a robottal?

A robot gyári firmware-ét (MicroPython + XRPLib) használja, a robotra nem kell semmit telepíteni.

- **Bluetooth**: Nordic UART szolgáltatás (`6e400001-…`), ugyanaz, amit az XRPCode használ.
- **Programfuttatás**: MicroPython *raw REPL*. Az app a programot `/slots/slotN.py` fájlba menti,
  a `/main.py`-t pedig egy kis indítóra cseréli (számítógép nélkül: rövid gombnyomás = indítás, hosszú = következő mentett hely), majd elindítja.
  ⚠️ Ez felülírja a robot korábbi `main.py` fájlját, ahogy az XRPCode is teszi futtatáskor.
- **Leállítás**: Ctrl-C, ha az nem jut át, akkor az XRPLib `##XRPSTOP##` üzenete (a robot újraindul, az app visszacsatlakozik).
- **Műszerfal**: az XRPLib `Dashboard` + XPP protokoll (`XRPLib/puppet.py`) a második Bluetooth-csatornán.
  Régebbi XRPLib esetén csak az akkufeszültség látszik, 30 másodpercenként frissítve.
- **Joystick**: XPP `$gamepad.*` változók; a Vezetés indítása egy kis vezetőprogramot futtat a roboton.

### Kód felépítése

```
src/
  blocks/blocks.ts     blokkdefiníciók, téma, eszköztár, mintaprogram
  codegen/python.ts    blokkok → MicroPython
  robot/ble.ts         Web Bluetooth kapcsolat
  robot/repl.ts        MicroPython raw REPL kliens
  robot/xpp.ts         XPP protokoll (műszerfal, joystick)
  robot/robot.ts       valódi robot (BleRobot)
  robot/sim.ts         demó robot
  robot/snippets.ts    a robotra küldött MicroPython részletek
  robot/battery.ts     feszültség → akku %
  ui/                  műszerfal, párbeszédablakok, ikonok
  i18n/                magyar és angol szövegek
```

## Ismert korlátok

- Az „amikor…” események egymás után futnak, nem párhuzamosan (egy figyelő ciklus kezeli őket).
- Az akkuszázalék a feszültségből becsült, a görbét valódi robottal kalibrálni kell (`src/robot/battery.ts`).
- Valódi roboton még nincs tesztelve: a Bluetooth/REPL réteg egységtesztekkel és szimulált MicroPython-táblával van ellenőrizve.
