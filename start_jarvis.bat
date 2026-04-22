@echo off
setlocal EnableDelayedExpansion
chcp 1251 >nul
pause
color 0c
cls

for /L %%i in (1,1,4) do (
    cls
    echo(                          ...----....
	echo(                    ..-:"''         ''"-..
	echo(                 .-'                      '-.
	echo(               .'              .     .       '.
	echo(             .'   .          .    .      .    .''.
	echo(           .'  .    .       .   .   .     .   . ..:.
	echo(         .' .   . .  .       .   .   ..  .   . ....::.
	echo(        ..   .   .      .  .    .     .  ..  . ....:IA.
	echo(       .:  .   .    .    .  .  .    .. .  .. .. ....:IA.
	echo(      .: .   .   ..   .    .     . . .. . ... ....:.:VHA.
	echo(      '..  .  .. .   .       .  . .. . .. . .....:.::IHHB.
	echo(     .:. .  . .  . .   .  .  . . . ...:.:... .......:HIHMM.
	echo(    .:.... .   . ."::"'.. .   .  . .:.:.:II;,. .. ..:IHIMMA
	echo(    ':.:..  ..::IHHHHHI::. . .  ...:.::::.,,,. . ....VIMMHM
	echo(   .:::I. .AHHHHHHHHHHAI::. .:...,:IIHHHHHHMMMHHL:. . VMMMM
	echo(  .:.:V.:IVHHHHHHHMHMHHH::..:" .:HIHHHHHHHHHHHHHMHHA. .VMMM.
	echo(  :..V.:IVHHHHHMMHHHHHHHB... . .:VPHHMHHHMMHHHHHHHHHAI.:VMMI
	echo(  ::V..:VIHHHHHHMMMHHHHHH. .   .I":IIMHHMMHHHHHHHHHHHAPI:WMM
	echo(  ::". .:.HHHHHHHHMMHHHHHI.  . .:..I:MHMMHHHHHHHHHMHV:':H:WM
	echo(  :: . :.::IIHHHHHHMMHHHHV  .ABA.:.:IMHMHMMMHMHHHHV:'. .IHWW
	echo(  '.  ..:..:.:IHHHHHMMHV" .AVMHMA.:.'VHMMMMHHHHHV:' .  :IHWV
	echo(   :.  .:...:".:.:TPP"   .AVMMHMMA.:. "VMMHHHP.:... .. :IVAI
	echo(  .:.   '... .:"'   .   ..HMMMHMMMA::. ."VHHI:::....  .:IHW'
	echo(  ...  .  . ..:IIPPIH: ..HMMMI.MMMV:I:.  .:ILLH:.. ...:I:IM
	echo(: .   .'"' .:.V". .. .  :HMMM:IMMMI::I. ..:HHIIPPHI::'.P:HM.
	echo(:.  .  .  .. ..:.. .    :AMMM IMMMM..:...:IV":T::I::.".:IHIMA
	echo('V:.. .. . .. .  .  .   'VMMV..VMMV :....:V:.:..:....::IHHHMH
	echo(  "IHH:.II:.. .:. .  . . . " :HB"" . . ..PI:.::.:::..:IHHMMV"
	echo(   :IP""HHII:.  .  .    . . .'V:. . . ..:IH:.:.::IHIHHMMMMM"
	echo(   :V:. VIMA:I..  .     .  . .. . .  .:.I:I:..:IHHHHMMHHMMM
	echo(   :"VI:.VWMA::. .:      .   .. .:. ..:.I::.:IVHHHMMMHMMMMI
	echo(   :."VIIHHMMA:.  .   .   .:  .:.. . .:.II:I:AMMMMMMHMMMMMI
	echo(   :..VIHIHMMMI...::.,:.,:!"I:!"I!"I!"V:AI:VAMMMMMMHMMMMMM'
	echo(   ':.:HIHIMHHA:"!!"I.:AXXXVVXXXXXXXA:."HPHIMMMMHHMHMMMMMV
	echo(     V:H:I:MA:W'I :AXXXIXII:IIIISSSSSSXXA.I.VMMMHMHMMMMMM
	echo(       'I::IVA ASSSSXSSSSBBSBMBSSSSSSBBMMMBS.VVMMHIMM'"'
	echo(        I:: VPAIMSSSSSSSSSBSSSMMBSSSBBMMMMXXI:MMHIMMI
	echo(       .I::. "H:XIIXBBMMMMMMMMMMMMMMMMMBXIXXMMPHIIMM'
	echo(       :::I.  ':XSSXXIIIIXSSBMBSSXXXIIIXXSMMAMI:.IMM
	echo(       :::I:.  .VSSSSSISISISSSBII:ISSSSBMMB:MI:..:MM
	echo(       ::.I:.  ':"SSSSSSSISISSXIIXSSSSBMMB:AHI:..MMM.
	echo(       ::.I:. . ..:"BBSSSSSSSSSSSSBBBMMMB:AHHI::.HMMI
	echo(       :..::.  . ..::":BBBBBSSBBBMMMB:MMMMHHII::IHHMI
	echo(       ':.I:... ....:IHHHHHMMMMMMMMMMMMMMMHHIIIIHMMV"
	echo(         "V:. ..:...:.IHHHMMMMMMMMMMMMMMMMHHHMHHMHP'
	echo(          ':. .:::.:.::III::IHHHHMMMMMHMHMMHHHHM"
	echo(            "::....::.:::..:..::IIIIIHHHHMMMHHMV"
	echo(              "::.::.. .. .  ...:::IIHHMMMMHMV"
	echo(                "V::... . .I::IHHMMV"'
	echo(                  '"VHVHHHAHHHHMMV:"'
    timeout /t 0.1 >nul
    cls
    timeout /t 0.1 >nul
)

echo ========================================
echo Xcord Core Server + Jarvis
echo ========================================
echo.

if not exist "%~dp0core" (
    echo ОШИБКА: папка core не найдена
    pause
    exit
)

cd /d "%~dp0core"

echo Проверка Python...
python --version || (echo Python не найден & pause & exit)
pause
echo [1] Проверка venv...
if not exist "venv\Scripts\python.exe" (
    echo Создаю venv...
    python -m venv venv || (echo Ошибка venv & pause & exit)
)
pause
echo [2] Активация...
call venv\Scripts\activate.bat || (echo Ошибка активации & pause & exit)
pause
echo [3] Установка библиотек...
pip install -r requirements.txt || (echo Ошибка pip & pause & exit)
pause
echo [4] Запуск...
python app.py

pause