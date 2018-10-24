const Ajv = require('ajv'),
  ajv = new Ajv({ allErrors: true });
ajv.addMetaSchema(require('ajv/lib/refs/json-schema-draft-06.json'));

const validate = (data, schema) => {
  const validation = ajv.validate(schema, data);
  if (!validation) throw new Error(ajv.errorsText(validation.errors));
};

const compare = (A, B) => {
  if (typeof A !== typeof B) throw new Error('cant compare elements of different types');
  if (typeof A === 'number') return A >= B;
  else return A === B;
};

const buildClassifier = (paramData, dataSchema) => {
  const data = [...paramData];
  if (!paramData || !dataSchema) throw new Error('Missing parameters');
  validate(data, dataSchema);

  const P = (...foos) => {
    return foos.reduce((res, foo, index) => {
      if (index < foos.length - 1) {
        return res.filter(foo);
      } else {
        return res.filter(foo).length / res.length;
      }
    }, data);
  };

  const bayes = (A, B, index) => {
    const pA = P(d => compare(d[0], A));
    const pAGivenB = P(d => compare(d[0], A), d => compare(d[index], B)) || 0;
    const pB = P(d => compare(d[index], B));
    return (pAGivenB * pA) / pB || 0;
  };

  const chainedBayes = ([A, ...rest]) => {
    const predictions = rest.reduce((res, r, index) => {
      const p = bayes(A, r, index + 1);
      return res + p;
    }, 0);
    return predictions / rest.length;
  };

  return { classify: chainedBayes };
};

// let data = [];
// for (let i = 0; i < 1; i++) {
//   if (i < 2) data.push({ gender: 'female', hair: 'long' });
//   else data.push({ gender: 'male', hair: 'short' });
// }
// for (let i = 0; i < 50; i++) {
//   if (i < 25) data.push({ gender: 'female', hair: 'long' });
//   else data.push({ gender: 'female', hair: 'short' });
// }
// data = data.map(d => [d.gender, d.hair]);

module.exports = { buildClassifier };

// const bayes = buildClassifier(data, {
//   type: 'array',
//   items: {
//     type: 'array',
//     items: [{ type: 'string' }, { type: 'string' }],
//     additionalItems: false
//   }
// });
// console.log(bayes.classify(['male', 'long']));
