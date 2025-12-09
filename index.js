const fs = require('fs');
const path = require('path');

// Custom JSON formatter that puts arrays on single lines
// AI code to make the output look prettier
function formatJSONWithSingleLineArrays(obj, indent = 1) {
  const indentStr = ' '.repeat(indent);
  const indentLevel = (level) => ' '.repeat(level * indent);
  
  function formatValue(value, level) {
    if (Array.isArray(value)) {
      if (value.length === 0) return '[]';
      // Format arrays as single lines
      const items = value.map(item => formatValue(item, level)).join(', ');
      return `[${items}]`;
    } else if (value !== null && typeof value === 'object') {
      const keys = Object.keys(value);
      if (keys.length === 0) return '{}';
      const items = keys.map(key => {
        const val = formatValue(value[key], level + 1);
        return `${indentLevel(level + 1)}"${key}": ${val}`;
      }).join(',\n');
      return `{\n${items}\n${indentLevel(level)}}`;
    } else if (typeof value === 'string') {
      return JSON.stringify(value);
    } else {
      return String(value);
    }
  }
  
  return formatValue(obj, 0);
}

// Read and parse both CSV files
async function readCSVFiles() {
  try {
    const presWinnersPath = path.join(__dirname, 'pres_winners.csv');
    const presWinnersContent = fs.readFileSync(presWinnersPath, 'utf-8');

    const yearAndParty = presWinnersContent.split('\n').map(line => line.split(',')).map(array => [array[0], array[2]])

    const usPresByStatePath = path.join(__dirname, 'us_pres_by_state.csv');
    const usPresByStateContent = fs.readFileSync(usPresByStatePath, 'utf-8');

    const convertedStateContent = usPresByStateContent.split("\n").map(row => row.split(",")).map(rowData => ({
      state: rowData[0],
      votingRecord: rowData.slice(1, rowData.length - 1)
    }))

    const stateData = convertedStateContent.slice(1, convertedStateContent.length - 1)

    // Extract years from yearAndParty
    const years = yearAndParty.map(entry => entry[0])

    // Map party abbreviations to full names
    // Based on pres winners.csv and historical election data
    // This is AI code, I didn't feel like doing this conversion myself, so I'm just hoping this works
    const partyMap = {
      'R': 'Rep.',
      'D': 'Dem.',
      'DR': 'D-R',           // Democratic-Republican
      'Jackson': 'Dem.',      // Andrew Jackson (Democratic)
      'SD': 'Dem.',           // Southern Democrat (1860)
      'SR': 'Dem.',           // States' Rights Democratic Party
      'I': 'Ind.',            // Independent
      'AI': 'Dem.',           // American Independent Party (treated as Dem. variant)
      'BM': 'Prog.',          // Bull Moose/Progressive Party (1912)
      'PO': 'Prog.',          // Progressive Party
      'GW': 'Ind.',           // George Washington (Independent)
      'F': 'Fed.',            // Federalist
      'Adams': 'NR',          // John Quincy Adams (National Republican)
      'NR': 'NR',             // National Republican
      'W': 'Whig',            // Whig Party
      'Crawford': 'D-R',      // William H. Crawford (Democratic-Republican)
      'LR': 'Rep.',           // Liberal Republican (treated as Rep. variant)
      'Clay': 'NR',           // Henry Clay (National Republican)
      'CU': 'Rep.',           // Constitutional Union (1860, treated as Rep. variant)
      'SP': 'D-R',            // Split/States' Rights (1800, treated as D-R)
      'KN': 'Dem.',           // Know Nothing/American Party (treated as Dem. variant)
      'ND': 'Dem.',           // Northern Democrat (1860)
      'N': 'Dem.',            // Northern (Democrat variant)
      'AM': 'Whig',           // Anti-Masonic Party (treated as Whig variant)
      'PR': 'Prog.',          // Progressive Republican (1924)
      '': '' // Keep empty strings as is
    }

    // Convert stateData to match yearAndParty format
    const convertedStateData = stateData.map(state => {
      const convertedRecord = state.votingRecord.map((party, index) => {
        const year = years[index]
        const fullPartyName = partyMap[party] !== undefined ? partyMap[party] : party

        return [year, fullPartyName]
      })
      return {
        state: state.state,
        votingRecord: convertedRecord
      }
    })

    
    const stateDataWins = convertedStateData.map(stateData => ({
      state: stateData.state,
      votingRecord: stateData.votingRecord,
      votingRecordWins: stateData.votingRecord.map((res, index) => res[1].length ? res[1] === yearAndParty[index][1] : null)
    }))
    

    const stateLossStreaks = stateDataWins.map(stateData => {
      let maxLosses = 0
      let currentLosses = 0

      let endIndex;

      stateData.votingRecordWins.forEach((res, index) => {
        if (res === true) {
          currentLosses = 0
        } else if (res === false) {
          currentLosses++
          if (currentLosses > maxLosses) {
            maxLosses = currentLosses
            endIndex = index
          }
        } else if (res === null) {
          // do nothing if empty
        }
      })

      return { ...stateData, lossLength: maxLosses, endLossIndex: endIndex }
    }).sort((a, b) => b.lossLength - a.lossLength)

    let maxLosses = 0
    stateLossStreaks.forEach(stateData => {
      if (stateData.lossLength > maxLosses) {
        maxLosses = stateData.lossLength
      }
    })

    const maxLs = stateLossStreaks.filter(data => data.lossLength === maxLosses)
    
    // maxLs.forEach(stateData => {
    //   let votingRecord = ''
    //   let winners = ''
    //   for (let i = maxLosses; i > 0; i--) {
    //     // console.log(years[stateData.endLossIndex - i])
    //     // console.log(stateData.votingRecord[stateData.endLossIndex - i][1])
    //     const index = stateData.endLossIndex - i + 1

    //     votingRecord += `${years[index]} - ${stateData.votingRecord[index][1]}  `
    //     winners += `${years[index]} - ${yearAndParty[index][1]}  `
    //   }


    //   let length = stateData.state.length - 7
    //   let isReverse = false

    //   if (length < 0) {
    //     isReverse = true
    //     length = length * -1
    //   }

    //   let spaces = ''
    //   for (let i = 0; i < length; i++) {
    //     spaces += ' '
    //   }
    //   console.log('\n')

    //   if (isReverse) {
    //     console.log(stateData.state + spaces + " " + votingRecord)
    //     console.log('Winners ' + winners)
    //   } else {
    //     console.log(stateData.state + " " + votingRecord)
    //     console.log('Winners ' + spaces + winners)
    //   }

    // })


    const stateWinLossStreaks = stateLossStreaks.map(stateData => {
      let maxWines = 0
      let currentWines = 0

      let endIndex;

      stateData.votingRecordWins.forEach((res, index) => {
        if (res === false) {
          currentWines = 0
        } else if (res === true) {
          currentWines++
          if (currentWines > maxWines) {
            maxWines = currentWines
            endIndex = index
          }
        } else if (res === null) {
          // do nothing if empty
        }
      })

      return { ...stateData, winLength: maxWines, endWinIndex: endIndex }
    }).sort((a, b) => b.winLength - a.winLength)


    let maxWins = 0
    stateWinLossStreaks.forEach(stateData => {
      if (stateData.winLength > maxWins) {
        maxWins = stateData.winLength
      }
    })

    const maxWs = stateWinLossStreaks.filter(data => data.winLength === maxWins)
    
    // maxWs.forEach(stateData => {
    //   let votingRecord = ''
    //   let winners = ''
    //   for (let i = maxWins; i > 0; i--) {
    //     const index = stateData.endWinIndex - i + 1

    //     votingRecord += `${years[index]} - ${stateData.votingRecord[index][1]}  `
    //     winners += `${years[index]} - ${yearAndParty[index][1]}  `
    //   }

    //   let length = stateData.state.length - 7
    //   let isReverse = false

    //   if (length < 0) {
    //     isReverse = true
    //     length = length * -1
    //   }

    //   let spaces = ''
    //   for (let i = 0; i < length; i++) {
    //     spaces += ' '
    //   }
    //   console.log('\n')

    //   if (isReverse) {
    //     console.log(stateData.state + spaces + " " + votingRecord)
    //     console.log('Winners ' + winners)
    //   } else {
    //     console.log(stateData.state + " " + votingRecord)
    //     console.log('Winners ' + spaces + winners)
    //   }

    // })

    // console.log(stateWinLossStreaks)

    return {
      stateWinLossStreaks,
      maxLs,
      maxWs,
      years
    };
    
  } catch (error) {
    console.error('Error reading CSV files:', error);
    throw error;
  }
}

// Execute if run directly
if (require.main === module) {
  readCSVFiles()
    .then(data => {
      const dataPath = path.join(__dirname, 'data.json');
      fs.writeFileSync(dataPath, formatJSONWithSingleLineArrays(data, 2), 'utf-8');
      console.log('Data saved to data.json');
      console.log('\n');
    })
    .catch(error => {
      console.error('Failed to read CSV files:', error);
      process.exit(1);
    });
}

// Export the function and data for use in other modules
module.exports = { readCSVFiles };

