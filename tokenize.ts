declare var require;
const begins = /^[ \t]+\{\{|^\{\{/;
const ends = /}}[ \t]+$|}}$/;

enum State {
    TEXT = 0,
    OPEN1,
    INSIDE_TAG_NAME,
    INSIDE_PARAM,
    INSIDE_QUOTE_PARAM,
    INSIDE_TAG_TEXT,
    OPEN_PARAM,
    CLOSE_PARAM,
    CLOSE1,
    ESCAPED,
    ESCAPED_CLOSE1
}

export enum TokenTypes {
    text = <any>'text',
    openTag = <any>'openTag',
    mustache = <any>'mustache',
    closeTag = <any>'closeTag',
    tagName = <any>'tagName',
    assignParam = <any>'assignParam',
    param = <any>'param',
    quoteParam = <any>'quoteParam',
    unquotedParam = <any>'unquotedParam'
}

export interface ILoc {
    start: number
    end: number
    column: number
    line: number
}

export interface IToken {
    type: TokenTypes,
    content: string,
    loc: ILoc
}

export interface ITag {
    tagName: string
    params: IParam[]
    body: ITag[]
    loc: ILoc
}
export interface IParam {
    key?:  string
    value: string
    loc:   ILoc
}

export function tokenize(incoming: string): IToken[] {

    function isTagOnlyLine(line) {
        return noEmitIndexes.indexOf(line) > -1;
    }

    const split = incoming.split(/\n/g);
    const noEmitIndexes = []; // lines that should never emit anything other that tags

    split.forEach((x, i) => {
        if (begins.test(x) && ends.test(x)) {
            noEmitIndexes.push(i);
        }
    });

    var len = incoming.length;
    var c : string;

    var line      = 0;
    var column    = 0;
    var pos       = 0;
    var emit      = true;
    var stack: Array<IToken> = [];
    var buffer    = '';
    var tagBuffer = '';
    var STATE: State = State.TEXT;
    var locStart  = 0;
    var lastEmitPos  = 0;
    var stackIndex = 0;

    const generateTag = (startPos: number = 0): ITag => ({
        tagName: '',
        params: [],
        body: [],
        loc: {start: startPos, end: 0, column, line}
    });
    const generateParam = (): IParam => ({
        key: '',
        value: 'string',
        loc: {start: 0, end: 0, column: column, line: line}
    });

    var currentTag   = generateTag();
    var currentParam = generateParam();

    const push = (node) => {
        node.index = stackIndex;
        stackIndex ++;
        stack.push(node);
    };

    const loc = (start, end, _column = column) => ({start, end, column: _column, line});

    while (pos < len) {
        c    = incoming.charAt(pos);
        emit = !isTagOnlyLine(line);

        // console.log(column, [c]);
        // console.log([c]);

        switch (STATE) {
            case State.TEXT:
                if (c === '\\') {
                    if (incoming.substring(pos + 1, pos + 3) === '{{') {
                        STATE = State.ESCAPED;
                        continue;
                    }
                }
                if (c === "{") {
                    STATE = State.OPEN1;
                    if (pos > lastEmitPos) {
                        const diff = pos - lastEmitPos;
                        push({type: TokenTypes.text, content: buffer, loc: loc(locStart, pos - (diff - 1), locStart)});
                    } else {
                        push({type: TokenTypes.text, content: buffer, loc: loc(locStart, pos, locStart)});
                    }

                    locStart = pos;
                    buffer = "";
                } else {
                    if (emit) {
                        buffer += c;
                    } else {
                        if (isNewline(c) && !emit) {
                            locStart = pos + 1;
                        }
                    }
                }
                break;
            case State.ESCAPED_CLOSE1:
                if (c === "}") {
                    buffer += c;
                    STATE = State.TEXT;
                    push({type: TokenTypes.text, content: buffer, loc: loc(locStart, pos + 1)});
                    buffer = '';
                }
                break;
            case State.ESCAPED:
                if (c === "}") {
                    STATE = State.ESCAPED_CLOSE1;
                }
                if (c === '\\') {
                    // console.log('Buffer escpace');
                    // escape char, do nothing
                } else {
                    buffer += c;
                }
                break;
            case State.OPEN1 :
                if (c === '{') {
                    // push({type: TokenTypes.openTag, content: '{{', loc: loc(pos-1, pos+1)});
                    locStart = pos + 1;
                    STATE = State.INSIDE_TAG_NAME;
                    currentTag = generateTag(pos - 1);
                    currentTag.loc.column = column - 1; // track back 1 char
                    buffer = ''; // empty the text buffer
                }
                break;
            case State.INSIDE_TAG_NAME:
                if (c === ' ') { // name ended 1
                    currentTag.tagName = tagBuffer;
                    // push({type: TokenTypes.tagName, content: tagBuffer, loc: loc(locStart, pos)});
                    locStart = pos;
                    tagBuffer = '';
                    STATE = State.INSIDE_TAG_TEXT;
                } else if (c === '}') { // name ended 2
                    currentTag.tagName = tagBuffer;
                    // push({type: TokenTypes.tagName, content: tagBuffer, loc: loc(locStart, pos)});
                    tagBuffer = '';
                    STATE = State.CLOSE1;
                } else {
                    tagBuffer += c; // keep adding the text
                }
                break;
            case State.INSIDE_TAG_TEXT:
                if (c === '=') {
                    // account for space after name
                    // push({type: TokenTypes.assignParam, content: tagBuffer.trim(), loc: loc(locStart + 1, pos)});
                    currentParam.key = tagBuffer.trim();
                    tagBuffer = '';
                    if (incoming.charAt(pos + 1) === '"') {
                        STATE = State.OPEN_PARAM;
                    } else {
                        STATE = State.INSIDE_PARAM;
                    }
                } else {
                    if (c === " ") {
                        if (tagBuffer) {
                            currentTag.params.push({value: tagBuffer.trim(), loc: loc(locStart + 1, pos)});
                            // push({type: TokenTypes.param, content: tagBuffer.trim(), loc: loc(locStart + 1, pos)});
                            locStart = pos;
                            tagBuffer = '';
                        }
                    }
                    if (c === "}") {
                        // check if there's anything lingering in the buffer
                        STATE = State.CLOSE1;
                        if (tagBuffer) {
                            // console.log('adding', tagBuffer);
                            currentTag.params.push({value: tagBuffer.trim(), loc: loc(locStart + 1, pos)});
                            // push({type: TokenTypes.param, content: tagBuffer.trim(), loc: loc(locStart + 1, pos)});
                            tagBuffer = '';
                        }
                    } else {
                        tagBuffer += c;
                    }
                }
                break;
            case State.OPEN_PARAM:
                STATE = State.INSIDE_QUOTE_PARAM;
                locStart = pos + 1;
                break;
            case State.CLOSE_PARAM:
                if (c === "}") {
                    STATE = State.CLOSE1;
                } else {
                    STATE = State.INSIDE_TAG_TEXT;
                }
                // locStart = pos + 1;
                break;
            case State.INSIDE_PARAM:
                if (c === ' ') {
                    if (tagBuffer) {
                        STATE = State.INSIDE_TAG_TEXT;
                        push({type: TokenTypes.unquotedParam, content: tagBuffer.trim(), loc: loc(locStart + 1, pos)});
                        tagBuffer = '';
                    }
                } else if (c === '}')  {
                    STATE = State.CLOSE1;
                    push({
                        type: TokenTypes.unquotedParam,
                        content: tagBuffer.trim(),
                        loc: loc(locStart + 1, pos)
                    });
                    tagBuffer = '';
                } else {
                    console.log('Adding', [c]);
                    tagBuffer += c;
                }
                break;
            case State.INSIDE_QUOTE_PARAM:
                if (c === '"') {
                    currentParam.value = tagBuffer;
                    currentTag.params.push({value: currentParam.value, key: currentParam.key, loc: loc(locStart, pos)});
                    currentParam = generateParam();
                    // push({type: TokenTypes.quoteParam, content: tagBuffer, loc: loc(locStart, pos)});
                    tagBuffer = '';
                    STATE = State.CLOSE_PARAM;
                } else {
                    tagBuffer += c;
                }
                break;
            case State.CLOSE1:
                if (c === "}") {
                    // console.log(currentTag);
                    if (currentTag.body.length === 0) { // not a block
                        // console.log('here', currentTag);
                        currentTag.loc.end = pos + 1;
                        push({type: TokenTypes.mustache, params: currentTag.params, loc: currentTag.loc});
                    }
                    // push({type: TokenTypes.closeTag, content: '}}', loc: loc(pos-1, pos+1)});
                    tagBuffer = '';
                    locStart = pos + 1;
                    currentTag = undefined;
                    STATE = State.TEXT;
                }
                break;
        }
// debug
        if (emit) {
            lastEmitPos = pos;
        }

        if (isNewline(c)) {
            line++;
            column = 0;
        } else {
            column++;
        }

        pos++;
    }

    if (buffer !== '') {
        push({type: TokenTypes.text, content: buffer, loc: loc(locStart, pos)});
    }

    return stack;
}

function isNewline (c) {
    return /\n/.test(c);
}

function isWs(char) {
    return char === ' ' || char === '\t';
}
