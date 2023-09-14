# accentdecent.github.io

Android Hacking Values

<ins>Arm64</ins>

~ 2 Billion:

```java
ARM:
MOV X0, #0x7F000000
ret

HEX:
00 E0 AF D2 C0 03 5F D6
```

return true:

```java
ARM:
MOV X0, #1
ret

HEX:
20 00 80 D2 C0 03 5F D6
```

return false:

```java
ARM:
MOV X0, #0
ret

HEX:
00 00 80 D2 C0 03 5F D6
```

NOP:
```java
HEX:
1F 20 03 D5
```

<ins>Armv7 (armeabi-v7a)</ins>

~ 2 Billion
```java
ARM:
mvn r0, #0x80000000
bx lr

HEX:
02 01 E0 E3 1E FF 2F E1
```

133 Million:

```java
ARM:
mov r0, #0x7f00000
bx lr

HEX:
7F 06 A0 E3 1E FF 2F E1
```

9999: 

```java
ARM:
movw r0, #0x270f
bx lr

HEX:
0F 07 02 E3 1E FF 2F E1
```
