// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
function getExactExpressionStartAndEnd(lineContent: string, looseStart: number, looseEnd: number): { start: number; end: number } {
	let matchingExpression: string | undefined = undefined;
	let startOffset = 0;

	// Some example supported expressions: myVar.prop, a.b.c.d, myVar?.prop, myVar->prop, MyClass::StaticProp, *myVar
	// Match any character except a set of characters which often break interesting sub-expressions
	const expression: RegExp = /([^()\[\]{}<>\s+\-/%~#^;=|,`!]|\->)+/g;
	let result: RegExpExecArray | null = null;

	// First find the full expression under the cursor
	while (result = expression.exec(lineContent)) {
		const start = result.index + 1;
		const end = start + result[0].length;

		if (start <= looseStart && end >= looseEnd) {
			matchingExpression = result[0];
			startOffset = start;
			break;
		}
	}

	// If there are non-word characters after the cursor, we want to truncate the expression then.
	// For example in expression 'a.b.c.d', if the focus was under 'b', 'a.b' would be evaluated.
	if (matchingExpression) {
		const subExpression: RegExp = /\w+/g;
		let subExpressionResult: RegExpExecArray | null = null;
		while (subExpressionResult = subExpression.exec(matchingExpression)) {
			const subEnd = subExpressionResult.index + 1 + startOffset + subExpressionResult[0].length;
			if (subEnd >= looseEnd) {
				break;
			}
		}

		if (subExpressionResult) {
			matchingExpression = matchingExpression.substring(0, subExpression.lastIndex);
		}
	}

	return matchingExpression ?
		{ start: startOffset, end: startOffset + matchingExpression.length - 1 } :
		{ start: 0, end: 0 };
}
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "TsDebug" is now active!');

	context.subscriptions.push(vscode.languages.registerEvaluatableExpressionProvider('typescript', {
		provideEvaluatableExpression(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.EvaluatableExpression> {
			const wordRange = document.getWordRangeAtPosition(position);
			if (wordRange) {
				const word = document.getText(wordRange);
				const code = document.getText();
				const regex = /import\s*{\s*([\w\s,]+)\s*}\s*from\s*['"]([\w./]+)['"]/g;
				var tsTypes: { [key: string]: string } = {};
				let match;
				while ((match = regex.exec(code))) {
					const types = match[1].split(',').map(t => t.trim());
					var file = match[2];
					var args = file.split("/");
					var cls = args[args.length - 1] + "_1.";
					for (let i = 0; i < types.length; i++) {
						const tp = types[i];
						tsTypes[tp] = cls;
					}
				}
				if (!tsTypes[word]) {
					let line = document.getText(new vscode.Range(position.line, 0, position.line, wordRange.end.character + 1));
					const { start, end } = getExactExpressionStartAndEnd(line, wordRange.end.character + 1, wordRange.end.character + 1);
					const matchingExpression = line.substring(start - 1, end);
					var args = matchingExpression.split('.');
					if (args.length > 1 && tsTypes[args[0]]) {
						var w = args.shift() as string;
						return new vscode.EvaluatableExpression(wordRange, `${tsTypes[w]}${w}.${args.join('.')}`);
					}
					return new vscode.EvaluatableExpression(wordRange, matchingExpression);
				}
				if (wordRange && wordRange.contains(position)) {
					return new vscode.EvaluatableExpression(wordRange, tsTypes[word] + word);
				}
			}
			return null;
		}
	}));

}

// This method is called when your extension is deactivated
export function deactivate() { }
