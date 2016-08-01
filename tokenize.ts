declare var require;
const tagOnly = /^([ \t]+)?\{\{(.+?)}}([ \t]+)?$/;

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
    closeTag = <any>'closeTag',
    tagName = <any>'tagName',
    assignParam = <any>'assignParam',
    param = <any>'param',
    quoteParam = <any>'quoteParam',
    unquotedParam = <any>'unquotedParam'
}

export interface IToken {
    type: TokenTypes,
    content: string,
    loc: ILoc
}

export interface ILoc {
    start: number;
    end: number;
    column: number;
    line: number;
}

export function tokenize(incoming: string): IToken[] {

    function isTagOnlyLine(line) {
        return noEmitIndexes.indexOf(line) > -1;
    }

    const split = incoming.split(/\n/g);
    const noEmitIndexes = []; // lines that should never emit anything other that tags

    split.forEach((x, i) => {
        if (tagOnly.test(x)) {
            noEmitIndexes.push(i);
        }
    });

    var len = incoming.length;
    var c : string;

    var line         = 0;
    var column       = 0;
    var pos          = 0;
    var canEmit      = true;
    var stack: Array<IToken> = [];
    var tagBuffer    = '';
    var STATE: State = State.TEXT;
    var locStart     = 0;
    var buffer       = '';

    const emit = (type: TokenTypes, content: string, loc: ILoc) => {
        stack.push({type, content, loc});
    };

    const loc = (start, end, _column = column, _line = line): ILoc => ({start, end, column: _column, line: _line});

    while (pos < len) {
        c    = incoming.charAt(pos);
        canEmit = !isTagOnlyLine(line);

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

                    if (buffer) {
                        emit(TokenTypes.text, buffer, loc(locStart, pos, locStart));
                    }

                    locStart = pos;
                    buffer = "";
                } else {
                    if (buffer && isNewline(c)) {
                        if (isTagOnlyLine(line + 1) && canEmit) {
                            buffer += c;
                            emit(TokenTypes.text, buffer, loc(locStart, pos, locStart));
                            buffer = '';
                        }
                    } else {
                        if (canEmit) {
                            buffer += c;
                        } else {
                            if (isNewline(c) && !canEmit) {
                                locStart = pos + 1;
                            }
                        }
                    }
                }
                break;
            case State.ESCAPED_CLOSE1:
                if (c === "}") {
                    buffer += c;
                    STATE = State.TEXT;
                    emit(TokenTypes.text, buffer, loc(locStart, pos + 1));
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
                    emit(TokenTypes.openTag, '{{', loc(pos-1, pos+1, column-1));
                    locStart = pos + 1;
                    STATE = State.INSIDE_TAG_NAME;
                    buffer = ''; // empty the text buffer
                }
                break;
            case State.INSIDE_TAG_NAME:
                if (c === ' ') { // name ended 1
                    emit(TokenTypes.tagName, tagBuffer, loc(locStart, pos));
                    locStart = pos;
                    tagBuffer = '';
                    STATE = State.INSIDE_TAG_TEXT;
                } else if (c === '}') { // name ended 2
                    STATE = State.CLOSE1;
                    emit(TokenTypes.tagName, tagBuffer, loc(locStart, pos));
                    tagBuffer = '';
                } else {
                    tagBuffer += c; // keep adding the text
                }
                break;
            case State.INSIDE_TAG_TEXT:
                if (c === '=') {
                    // account for space after name
                    emit(TokenTypes.assignParam, tagBuffer.trim(), loc(locStart + 1, pos));
                    tagBuffer = '';
                    if (incoming.charAt(pos + 1) === '"') {
                        STATE = State.OPEN_PARAM;
                    } else {
                        STATE = State.INSIDE_PARAM;
                    }
                } else {
                    if (c === " ") {
                        if (tagBuffer) {
                            emit(TokenTypes.param, tagBuffer.trim(), loc(locStart + 1, pos));
                            locStart = pos;
                            tagBuffer = '';
                        }
                    }
                    if (c === "}") {
                        // check if there's anything lingering in the buffer
                        STATE = State.CLOSE1;
                        if (tagBuffer) {
                            emit(TokenTypes.param, tagBuffer.trim(), loc(locStart + 1, pos));
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
                        emit(TokenTypes.unquotedParam, tagBuffer.trim(), loc(locStart + 1, pos));
                        tagBuffer = '';
                    }
                } else if (c === '}')  {
                    STATE = State.CLOSE1;
                    emit(TokenTypes.unquotedParam, tagBuffer.trim(), loc(locStart + 1, pos));
                    tagBuffer = '';
                } else {
                    // console.log('Adding', [c]);
                    tagBuffer += c;
                }
                break;
            case State.INSIDE_QUOTE_PARAM:
                if (c === '"') {
                    emit(TokenTypes.quoteParam, tagBuffer, loc(locStart, pos));
                    tagBuffer = '';
                    STATE = State.CLOSE_PARAM;
                } else {
                    tagBuffer += c;
                }
                break;
            case State.CLOSE1:
                if (c === "}") {
                    STATE = State.TEXT;
                    emit(TokenTypes.closeTag, '}}', loc(pos-1, pos+1));
                    if (tagBuffer) {
                        // push({type: NodeTypes.tag, tagBuffer, loc());
                    }
                    tagBuffer = '';
                    locStart = pos + 1;
                }
                break;
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
        emit(TokenTypes.text, buffer, loc(locStart, pos));
    }

    return stack;
}

function isNewline (c) {
    return /\n/.test(c);
}

function isWs(char) {
    return char === ' ' || char === '\t';
}
