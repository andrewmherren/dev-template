// Shared by the hooks in this folder: splits a shell command into simple commands, the way the
// hooks need to look at them. Good enough for a guardrail, not a shell parser.

const path = require('path');

// Splits a command line into simple commands (arrays of words), honoring quotes.
// Separators: ; & | && || newlines and parentheses. Each array's `pipedIn` is true when a
// single `|` feeds it (its standard input comes from the command before).
function splitCommands(cmd) {
    const commands = [];
    let words = [];
    let word = null;
    let pipedIn = false;
    const endWord = () => { if (word !== null) { words.push(word); word = null; } };
    const endCommand = (nextPipedIn) => {
        endWord();
        if (words.length) { words.pipedIn = pipedIn; commands.push(words); }
        words = [];
        pipedIn = nextPipedIn;
    };
    for (let i = 0; i < cmd.length; i++) {
        const c = cmd[i];
        if (c === "'") {
            const j = cmd.indexOf("'", i + 1);
            const end = j < 0 ? cmd.length : j;
            word = (word || '') + cmd.slice(i + 1, end);
            i = end;
        } else if (c === '"') {
            let s = '';
            for (i++; i < cmd.length && cmd[i] !== '"'; i++) {
                if (cmd[i] === '\\' && i + 1 < cmd.length) i++;
                s += cmd[i];
            }
            word = (word || '') + s;
        } else if (c === '\\' && i + 1 < cmd.length) {
            if (cmd[i + 1] !== '\n') word = (word || '') + cmd[i + 1];
            i++;
        } else if (c === '|' && cmd[i + 1] !== '|' && cmd[i - 1] !== '|') {
            endCommand(true);
        } else if (/[;&|\n()]/.test(c)) {
            endCommand(false);
        } else if (/\s/.test(c)) {
            endWord();
        } else {
            word = (word || '') + c;
        }
    }
    endCommand(false);
    return commands;
}

const WRAPPERS = new Set(['env', 'command', 'builtin', 'exec', 'nohup', 'time', 'sudo', 'nice', 'timeout']);
// Commands that run another command line given as text, which the hooks can't split reliably.
const SHELLS = new Set(['bash', 'sh', 'zsh', 'dash', 'eval', 'xargs', 'watch', 'ssh']);

// The command's name and its arguments, past VAR=value assignments and wrappers like env or sudo.
function commandStart(words) {
    let i = 0;
    // Also skips wrapper options and values like `timeout 10` (a number, not a command).
    while (i < words.length && (/^[A-Za-z_][A-Za-z0-9_]*=/.test(words[i]) || WRAPPERS.has(words[i])
        || (i > 0 && (words[i].startsWith('-') || /^[0-9.]+[smhd]?$/.test(words[i]))))) i++;
    return { verb: path.basename(words[i] || ''), rest: words.slice(i + 1) };
}

module.exports = { splitCommands, commandStart, SHELLS };
