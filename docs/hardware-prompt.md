# XRP mini robot – hardveres munkamenet indító prompt

> Másold be ezt az egészet egy új Claude-munkamenetbe. A szoftver (XRP Blocky app) egy másik munkamenetben készül: https://github.com/kornel-j/xrpblocky

---

## Szereped

Hardver- és 3D-tervező partnerem vagy. Egy **mini robotot** építünk a **SparkFun XRP Controller** vezérlőre, a CircuitMess Butter Bot hangulatában: kicsi, barátságos, lánctalpas vagy kerekes asztali robot, „arccal” (OLED-kijelző) és szenzorokkal. Gyerekeknek (10–14 év) készül, osztálytermi használatra.

Ebben a munkamenetben **csak a hardverrel** foglalkozunk: alkatrészlista, méretek, elrendezés, bekötés, 3D-nyomtatható ház és alváz. Az appot (blokkos programozás, Bluetooth, műszerfal) máshol fejlesztjük. Ha a hardverről olyan döntés születik, ami az appot érinti, azt a végén a **„Robotprofil az apphoz”** formában add át.

Magyarul válaszolj. Ha egy méretet vagy adatot nem tudsz biztosan, ne találd ki: jelöld „ellenőrizendő”-nek, és kérd meg, hogy tolómérővel mérjem le, vagy keresd meg a gyártói adatlapon.

## Amit a vezérlőről tudunk

Forrás: [SparkFun XRP Controller hardware overview](https://github.com/sparkfun/SparkFun_XRP_Controller/blob/main/docs/hardware_overview.md). Két változat létezik; nálam valószínűleg a **jelenlegi (RP2350)** van, de ezt még ellenőrizni kell. Az app robotmenüjében a „Kártya” sor mutatja.

| Rész | Jelenlegi XRP Controller | Beta |
|---|---|---|
| Processzor | RP2350 + Radio Module 2 (Wi-Fi, BLE) | Pico W (RP2040) |
| Motorcsatlakozók | 4 db 6 tűs: Motor L, Motor R, Motor 3, Motor 4 (motor ±, VCC, GND, enkóder A, B), DRV8411A | 4 db, DRV8835 |
| Szervócsatlakozók | 4 db 3 tűs (5 V, GND, PWM) | 2 db |
| IMU | LSM6DSO a lapon (3 tengelyes gyorsulás + giroszkóp) | ugyanaz |
| Érzékelő-csatlakozók | Line (2 vonalérzékelő), DIST (ultrahang Trig/Echo), 2 × Qwiic (I²C) | Line, Range, 1 × Qwiic |
| Gombok | USER (programozható), RESET, BOOT | USER, RESET, BOOTSEL |
| LED-ek | RGB (WS2812), STAT, MOT, SYS, LOW VOLT | LED, MOT, SYS |
| Táp | Hordócsatlakozó 4,8–11 V, főkapcsoló, USB-C | 5–11 V, micro-USB |

**Nem ismert, mérni vagy keresni kell:** a lap pontos mérete, a rögzítő furatok helye és átmérője, a csatlakozók pozíciója és magassága, a hordócsatlakozó mérete, valamint a csatlakozótípusok (JST-sorozat, osztás) a motor-, Line- és DIST-portokon. Először keresd meg a SparkFun hivatalos méretrajzát vagy CAD-fájlját (Eagle/KiCad board, STEP). Ha nincs meg, kérd tőlem a mérést, és mondd meg pontosan, mit mérjek.

Az XRPLib-ben (`XRPLib/board.py`, `differential_drive.py`) van egy **NanoXRP** változat is (3,46 cm kerék, 7,8 cm nyomtáv, 1 cellás LiPo, berregő). Nézz utána, kapható-e: mini robothoz jobb alap lehet.

## Tervezett alkatrészek (javaslat, véglegesítendő)

| Funkció | Javasolt alkatrész | Csatlakozás |
|---|---|---|
| Hajtás | 2 × N20 (micro metal gearmotor) mágneses enkóderrel, 6 V; Pololu Zumo-lánctalp vagy kis kerék | Motor L / Motor R, átalakító kábel |
| Arc | SparkFun Qwiic OLED 1,3" 128×64 | Qwiic |
| Akadályérzékelés | SparkFun Qwiic ToF (VL53L1X) | Qwiic |
| Arcfelismerés (opcionális) | Useful Sensors Person Sensor (Qwiic) vagy DFRobot HuskyLens | Qwiic / I²C |
| Mozgásérzékelő (opcionális) | SparkFun Qwiic PIR | Qwiic |
| Környezet (opcionális) | Qwiic BME688 vagy BME280 | Qwiic |
| Hang | Piezo berregő | szabad szervócsatlakozó (PWM) |
| Elosztó | Qwiic MultiPort + rövid Qwiic kábelek | Qwiic |
| Akku | 4 × AAA tartó (4,8–6 V) vagy 2 cellás 7,4 V LiPo + kapcsoló | hordócsatlakozó |

A beszédet és a hangparancsokat az app a telefon/laptop hangszórójával és mikrofonjával oldja meg, ezért ezekhez a roboton nem kell alkatrész.

## Tervezési követelmények

1. **Méret:** a lehető legkisebb, ami a vezérlőt elviszi; cél kb. 13–15 cm hossz (a végleges mérethez kell a vezérlő mérete). Ha a NanoXRP elérhető, készíts egy kisebb változatot is.
2. **Hozzáférés kívülről:** USER gomb (ezzel indul a program számítógép nélkül), RESET, főkapcsoló, USB-C, akkucsere szerszám nélkül vagy egy csavarral.
3. **Láthatóság:** az RGB LED fénye látsszon kívülről (fényvezető vagy ablak); az OLED legyen az „arc” elöl.
4. **Szenzorok:** a ToF-szenzornak szabad látómező kell előre; a vonalérzékelő 3–8 mm-re legyen a talajtól, ha használjuk.
5. **IMU:** a vezérlő vízszintesen, rezgésmentesen, a robot forgástengelyéhez közel legyen.
6. **Kábelezés:** Qwiic- és motorkábelek vezetése, tehermentesítés, szerelés forrasztás nélkül, ahol lehet.
7. **Nyomtathatóság:** FDM, PLA vagy PETG, 0,4 mm fúvóka, támasz nélkül nyomtatható részek; illesztési hézag 0,2–0,3 mm; M2 / M2.5 / M3 csavarok, hőre betéthető menetes betétekkel.
8. **Gyerekbarát:** lekerekített élek, ne legyenek kiálló csavarok, a lánctalp vagy a kerék ne csípje be az ujjat; legyen lehetőség matricára vagy színes cserélhető burkolatra (az app minden robothoz nevet és színt rendel).
9. **Parametrikus modell:** **OpenSCAD** vagy **CadQuery** (Python), a fő méretek változóként a fájl elején, hogy mérés után könnyen javítható legyen. Exportálj STL-t is.

## Amit kérek tőled (sorrendben)

1. Keresd meg és foglald össze a vezérlő pontos méreteit és rögzítési pontjait; ami hiányzik, arra adj mérési listát.
2. Véglegesítsd az alkatrészlistát: termék, méret, tömeg, csatlakozó, ár, beszerzési hely (EU-s vagy magyar bolt előnyben).
3. Rajzolj elrendezési vázlatot: felülnézet és oldalnézet, hová kerül a vezérlő, az akku, a motorok, az OLED és a szenzorok, hol a súlypont.
4. Készíts bekötési táblázatot: melyik alkatrész melyik portra kerül, milyen kábellel, Qwiic I²C-címekkel (ütközés ellenőrzése).
5. Írd meg a parametrikus 3D-modellt: alváz/alaplap, motortartók, felső burkolat, arc-előlap, akkutartó.
6. Írj összeszerelési útmutatót gyerekeknek is érthető lépésekkel.

## Robotprofil az apphoz (ezt add vissza a végén)

Az app ezekből számolja a „menj X cm-t” és a „fordulj X fokot” blokkokat, és ezekből tudja, milyen kiegészítők vannak. Töltsd ki, és jelöld, mi mért és mi becsült:

```json
{
  "name": "XRP Mini",
  "board": "XRP Controller (RP2350) | Beta | NanoXRP",
  "wheel_diameter_cm": 0,
  "wheel_track_cm": 0,
  "drive": "wheels | tracks",
  "motor_left_port": "Motor L",
  "motor_right_port": "Motor R",
  "motor_left_reversed": false,
  "motor_right_reversed": false,
  "encoder_counts_per_motor_rev": 12,
  "gear_ratio": 0,
  "motor_rated_voltage_v": 6,
  "battery": "4xAAA | 4xAA NiMH | 2S LiPo 7.4V | 1S LiPo",
  "max_effort_limit": 1.0,
  "buzzer_servo_port": null,
  "qwiic_devices": [
    { "type": "oled_128x64", "address": "0x3D" },
    { "type": "tof_vl53l1x", "address": "0x29" }
  ],
  "line_sensor": false,
  "ultrasonic": false,
  "notes": ""
}
```

Megjegyzés az apphoz: az XRPLib gyári értékei 585 enkóderimpulzus/kerékfordulat (12 × 48,75-ös áttétel), 6 cm kerék és 15,5 cm nyomtáv. Ha más motort vagy kereket használunk, ezeket felül kell írni. Ha a motor 6 V-os, de az akku 7,4 V, a `max_effort_limit` legyen kb. 0,8.
