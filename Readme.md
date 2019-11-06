# Grok Pattern Extension

Simple extension for working with Grok Patterns in VSCode

Use with file extension *.grok*. The first line is the GROK pattern and the rest the text to match line by line. 

The grok engine is custom made and may not be perfect. It replaces ```%{PATTERN:FIELD}``` with ```(?<FIELD>REGEX_PATTERN)``` using the alredy compatible named captured groups in javascript.

Atomic captured groups **are not supported** ```(?>PATTERN)```, so they need to be transformed to non captured groups ```(?:)``` as to work.

#### NEEDS Nodejs >= 10.3

![Grok Pattern extension](https://raw.githubusercontent.com/SecSamDev/grok-vscode/master/doc/extension_show.png)


### GROK patterns using Atomic groups

* BASE10NUM
* QUOTEDSTRING
* UNIXPATH
* WINPATH
* YEAR