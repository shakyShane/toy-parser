import {IToken, TokenTypes, ILoc} from "./tokenize";

export enum ASTNodeTypes {
    Block = <any>'Block',
    Param = <any>'Param',
    QuotedParam = <any>'QuotedParam',
    UnQuotedParam = <any>'UnQuotedParam',
    Text = <any>'Text',
    Lookup = <any>'Lookup'
}

export interface IParam {
    key?: string,
    value: string,
    loc: ILoc,
    locEnd?: ILoc
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
let upcomingParam;

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
                    tagName: token.content,
                    params:  [],
                    body:    [],
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

        if (token.type === TokenTypes.assignParam) {
            upcomingParam = token;
        }

        if (token.type === TokenTypes.quoteParam) {
            var parent = tagStack[tagStack.length-1];
            if (parent && upcomingParam) {
                parent.params.push({
                    type: ASTNodeTypes.QuotedParam,
                    key: upcomingParam.content,
                    value: token.content,
                    loc: upcomingParam.loc,
                    locEnd: token.loc
                })
            }
        }

        if (token.type === TokenTypes.unquotedParam) {
            var parent = tagStack[tagStack.length-1];
            if (parent && upcomingParam) {
                parent.params.push({
                    type: ASTNodeTypes.UnQuotedParam,
                    key: upcomingParam.content,
                    value: token.content,
                    loc: upcomingParam.loc,
                    locEnd: token.loc
                })
            }
        }

        if (token.type === TokenTypes.param) {
            var parent = tagStack[tagStack.length-1];
            if (parent) {
                parent.params.push({
                    type: ASTNodeTypes.Param,
                    value: token.content,
                    loc: token.loc
                });
            }
        }
    });

    return stack;
}

export function parse (tokens: IToken[]): ASTNode[] {
    return tokensToAST(tokens);
}
