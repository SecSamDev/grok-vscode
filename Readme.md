# Grok Pattern Extension

Simple extension to work with REGEX and Grok Patterns in VSCode

Use the .grok file extension. The first line is the REGEX or GROK pattern, the rest of the lines are logs that the pattern must match. 

## Parse log files using GROK
![Grok Pattern Export](https://raw.githubusercontent.com/SecSamDev/grok-vscode/master/doc/GROKing_files.png)

## Export GROK to REGEX
![Grok Pattern Export](https://raw.githubusercontent.com/SecSamDev/grok-vscode/master/doc/grok-export.gif)

The grok engine is custom made and may not be perfect. It replaces ```%{PATTERN:FIELD}``` with ```(?<FIELD>REGEX_PATTERN)``` using the alredy compatible named captured groups in javascript.

Atomic captured groups **are not supported** ```(?>PATTERN)```, so they need to be transformed into non captured groups ```(?:)``` to make it work.

**GROK patterns using Atomic groups:**
* BASE10NUM
* QUOTEDSTRING
* UNIXPATH
* WINPATH
* YEAR

#### NEEDS Nodejs >= 10.3

![Grok Pattern extension](https://raw.githubusercontent.com/SecSamDev/grok-vscode/master/doc/extension_show.png)



