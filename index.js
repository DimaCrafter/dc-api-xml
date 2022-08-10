const { registerContentType } = require('dc-api-core/utils/parsers');
const SAX = require('sax');

registerContentType('application/xml', (_req, body) => {
	const parser = SAX.parser(true);
	const root = {};
	const parentPath = [];
	let current = root;

	let error;
	parser.onerror = _error => error = _error;

	parser.onopentag = node => {
		parentPath.push(current);
		const entry = { _attr: node.attributes };

		const prev = current[node.name];
		if (prev) {
			if (prev instanceof Array) prev.push(entry);
			else current[node.name] = [prev, entry];
		} else {
			current[node.name] = entry;
		}

		current = entry;
	};

	parser.ontext = value => {
		if (value.trim().length == 0) return;

		const prev = current._text;
		if (prev) {
			if (prev instanceof Array) prev.push(value);
			else current._text = [prev, value];
		} else {
			current._text = value;
		}
	};

	parser.onclosetag = name => {
		if (Object.keys(current._attr).length == 0) {
			delete current._attr;
		}

		const parent = parentPath.pop();

		const keys = Object.keys(current);
		if (keys.length == 1) {
			const prev = parent[name];
			if (prev instanceof Array) {
				prev[prev.indexOf(current)] = current[keys[0]];
			} else {
				parent[name] = current[keys[0]];
			}
		}

		current = parent;
	};

	try { parser.write(body.toString()).close(); }
	catch (_error) { error = _error; }

	if (error) return { error, message: 'Incorrect XML body. ' + error.message };
	else return { body: root };
});
