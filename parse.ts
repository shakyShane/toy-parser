import {IToken, TokenTypes, ILoc} from "./tokenize";

export enum ASTNodeTypes {
    Block = <any>'Block',
    Text = <any>'Text',
    Lookup = <any>'Lookup'
}

export interface IParam {
    key?: string,
    value: string,
    loc: ILoc
}

export interface ASTNode {
    content?: string
    type: ASTNodeTypes,
    loc: ILoc
}

export interface BlockElement extends ASTNode {
    body: ASTNode[]
    tagName: string
    params: IParam[]
    locEnd?: ILoc
}

const blockRegex = /^[#@]/;

function tokensToAST (tokens: IToken[]): ASTNode[] {

    const tagStack: BlockElement[] = [];
    const stack:    ASTNode[]      = [];

    function addElement (element) {
        const parent = tagStack[tagStack.length - 1];
        const siblings = parent ? parent.body : stack;
        siblings.push(element);
    }

    tokens.forEach(function (token) {

        if (token.type === TokenTypes.text) {
            addElement({
                type: ASTNodeTypes.Text,
                loc: token.loc,
                content: token.content
            });
        }

        if (token.type === TokenTypes.tagName) {

            const firstChar = token.content.charAt(0);

            // block
            if (blockRegex.test(firstChar)) {

                const blockElem = {
                    type:    ASTNodeTypes.Block,
                    body:    [],
                    params:  [],
                    tagName: token.content,
                    loc:     token.loc
                };

                addElement(blockElem);

                tagStack.push(blockElem);

                // closing block
            } else if (firstChar === '/') {

                var out = tagStack.pop();
                out.locEnd = token.loc;

                // VAR type
            } else {
                const lookupElem = {
                    type:    ASTNodeTypes.Lookup,
                    body:    [],
                    params:  [],
                    tagName: token.content,
                    loc:     token.loc
                } as ASTNode;

                addElement(lookupElem);
            }
        }
    });

    return stack;
}

export function parse (tokens: IToken[]): ASTNode[] {
    return tokensToAST(tokens);
}
