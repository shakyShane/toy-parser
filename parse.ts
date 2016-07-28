import {IToken} from "./tokenize";

export interface ASTNode {
    content: string
}

export function parse (tokens: IToken): ASTNode[] {
    return [{content: 'here'}];
}
