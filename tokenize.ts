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
    loc: {
        start: number
        end: number
    }
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

    var line = 0;
    var pos       = 0;
    var emit      = true;
    var stack: Array<IToken> = [];
    var buffer    = '';
    var tagBuffer = '';
    var STATE: State = State.TEXT;
    var locStart  = 0;
    var lastEmitPos  = 0;
    var stackIndex = 0;

    const generateTag = () => ({
        tagName: '',
        params: [],
        body: []
    });

    var currentTag  = generateTag();
    var isInsideTag = false;

    const push = (node) => {
        node.index = stackIndex;
        stackIndex ++;
        stack.push(node);
    };
    const loc = (start, end) => ({start, end});

    while (pos < len) {
        c    = incoming.charAt(pos);
        emit = !isTagOnlyLine(line);

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
                        push({type: TokenTypes.text, content: buffer, loc: loc(locStart, pos - (diff - 1))});
                    } else {
                        push({type: TokenTypes.text, content: buffer, loc: loc(locStart, pos)});
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
                    buffer = ''; // empty the text buffer
                }
                break;
            case State.INSIDE_TAG_NAME:
                if (c === ' ') { // name ended 1
                    push({type: TokenTypes.tagName, content: tagBuffer, loc: loc(locStart, pos)});
                    locStart = pos;
                    tagBuffer = '';
                    STATE = State.INSIDE_TAG_TEXT;
                } else if (c === '}') { // name ended 2
                    STATE = State.CLOSE1;
                    push({type: TokenTypes.tagName, content: tagBuffer, loc: loc(locStart, pos)});
                    tagBuffer = '';
                } else {
                    tagBuffer += c; // keep adding the text
                }
                break;
            case State.INSIDE_TAG_TEXT:
                if (c === '=') {
                    // account for space after name
                    push({
                        type: TokenTypes.assignParam,
                        content: tagBuffer.trim(),
                        loc: loc(locStart + 1, pos)
                    });
                    tagBuffer = '';
                    if (incoming.charAt(pos + 1) === '"') {
                        STATE = State.OPEN_PARAM;
                    } else {
                        STATE = State.INSIDE_PARAM;
                    }
                } else {
                    if (c === " ") {
                        if (tagBuffer) {
                            push({
                                type: TokenTypes.param,
                                content: tagBuffer.trim(),
                                loc: loc(locStart + 1, pos)
                            });
                            locStart = pos;
                            tagBuffer = '';
                        }
                    }
                    if (c === "}") {
                        // check if there's anything lingering in the buffer
                        STATE = State.CLOSE1;
                        if (tagBuffer) {
                            push({
                                type: TokenTypes.param,
                                content: tagBuffer.trim(),
                                loc: loc(locStart + 1, pos)
                            });
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
                    push({type: TokenTypes.quoteParam, content: tagBuffer, loc: loc(locStart, pos)});
                    tagBuffer = '';
                    STATE = State.CLOSE_PARAM;
                } else {
                    tagBuffer += c;
                }
                break;
            case State.CLOSE1:
                if (c === "}") {
                    STATE = State.TEXT;
                    push({type: TokenTypes.closeTag, content: '}}', loc: loc(pos-1, pos+1)});
                    if (tagBuffer) {
                        // push({type: NodeTypes.tag, content: tagBuffer, loc: loc()});
                    }
                    tagBuffer = '';
                    locStart = pos + 1;
                }
                break;
        }
// debug
        if (emit) {
            lastEmitPos = pos;
        }

        if (isNewline(c)) {
            line++;
        }

        pos++;
    }

    if (buffer !== '') {
        push({type: TokenTypes.text, content: buffer, loc: loc(locStart, pos)});
    }

    return stack;
}


// console.log([buffer]);
// console.log([tagBuffer]);
// console.log(stack);
// console.log(stack.filter(x => x.type === 'text').map(x => x.content).join(''));

// console.log(stack[0]);
// const testLoc = (index) => s.substring(stack[index].loc.start, stack[index].loc.end);
// // console.log([s.substring(stack[14].loc.start, stack[14].loc.end)]);
//
// const out = stack.reduce(function (string, item) {
//     if (item.type === NodeTypes.text) {
//         console.log('TEXT', [item.content]);
//         return string + item.content;
//     }
//     if (item.type === NodeTypes.tagName) {
//         if (item.content[0] === '#') {
//             console.log('OPEN Block', item.content);
//         } else if (item.content[0] === '/') {
//             console.log('CLOSE Block', item.content);
//         } else {
//             console.log('VAR lookup', item.content);
//         }
//     }
//
//     if (item.type === NodeTypes.assignParam) {
//         console.log('  PARAM (assign)', item.content);
//     }
//
//     if (item.type === NodeTypes.unquotedParam) {
//         console.log('  PARAM (unquoted)', item.content);
//     }
//
//     if (item.type === NodeTypes.param) {
//         console.log('  PARAM (single)', [item.content]);
//     }
//
//     if (item.type === NodeTypes.quoteParam) {
//         console.log('    Quote param', [item.content]);
//     }
//
//     if (item.type === NodeTypes.closeTag) {
//         // console.log('Tag Closed', item.content);
//     }
//
//     return string;
//
// }, '');

// console.log(out);
// console.log(stack);

function isNewline (c) {
    return /\n/.test(c);
}

function isWs(char) {
    return char === ' ' || char === '\t';
}
