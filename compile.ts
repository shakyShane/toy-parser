import {IToken, TokenTypes} from "./tokenize";

export function compile (ast: IToken[]): string {
    return 'string';
}

export function toString (node: IToken, subject): string {
    return subject.substring(node.loc.start, node.loc.end);
}