const request = require('co-request');
const fs = require('fs');
const { resolve } = require('path');
const path = require('path')
const pinyin = require("pinyin");

let areasCrawlerDomin = 'https://geo.datav.aliyun.com'
let areaPath = '/areas_v3/bound/'
let errorArea = []
let provinceNum = 0
let cityNum = 0
let districtNum = 0
function checkFloder(path) {
  return new Promise((resolve, reject) => {
    fs.access(path, (err) => {
      if (err) {
        console.log('文件夹不存在')
        // console.log(err)
        resolve(false)
      } else {
        console.log('文件夹存在')
        resolve(true)
      }
    })
  })
}

function checkFile(path) {
  return new Promise((resolve, reject) => {
    fs.access(path, (err) => {
      if (err) {
        console.log('文件不存在')
        // console.log(err)
        resolve(false)
      }else {
        console.log('文件存在')
        resolve(true)
      }
    })
  })
}

function mkdir(path) {
  return new Promise((resolve, reject) => {
    fs.mkdir(path, (err) => {
      if (err) {
        console.log('目录创建失败');
        console.log(err)
        reject(err)
      } else {
        console.log('目录创建成功', path);
        resolve()
      }
    })
  })
}

function writeFile(path, data, encoding) {
  return new Promise((resolve, reject) => {
    fs.writeFile(path, data, encoding, function (error) {
      if (error) {
        console.log('文件写入失败');
        console.log(error);
        reject(error)
      } else {
        console.log('文件写入成功', path);
        resolve()
      }
    })
  })

}

function setDelay(delay) {
  return new Promise((resolve,reject) => {
    setTimeout(() => resolve(), delay)
  })
}

// 下载全国
async function crawlerChina() {
  let adcode = '100000_full'
  await setDelay(1000)
  let res = await request({
    uri: areasCrawlerDomin + areaPath + adcode + '.json'
  })
  let floderPath = path.resolve(__dirname, 'areas')

  let isHave = await checkFloder(floderPath)
  console.log(isHave)
  if (!isHave) {
    await mkdir(floderPath)
  }
  await writeFile(floderPath + '/china.json', res.body, 'utf8')

  return new Promise(resolve => resolve(res.body))
}

// 下载省
async function crawlerProvince(adcode, childrenNum) {
  console.log(adcode, childrenNum)

  let res
  if(childrenNum === 0) {
    res = await request({
      uri: areasCrawlerDomin + areaPath + adcode + '.json'
    })
  } else {
    res = await request({
      uri: areasCrawlerDomin + areaPath + adcode + '_full.json'
    })
  }
  let floderPath = path.resolve(__dirname, 'areas/province')

  let isHave = await checkFloder(floderPath)
  if (!isHave) {
    await mkdir(floderPath)
  }
  await writeFile(floderPath + '/' + adcode + '.json', res.body, 'utf8')
  // console.log(adcode)
  return new Promise(resolve => resolve(res.body))
}

// 下载市
async function crawlerCity(adcode, childrenNum) {
  try {

    console.log(adcode, childrenNum)
    let res
    if(childrenNum === 0) {
      res = await request({
        uri: areasCrawlerDomin + areaPath + adcode + '.json'
      })
    } else {
      res = await request({
        uri: areasCrawlerDomin + areaPath + adcode + '_full.json'
      })
    }
    let floderPath = path.resolve(__dirname, 'areas/city')
  
    let isHave = await checkFloder(floderPath)
    if (!isHave) {
      await mkdir(floderPath)
    }
    await writeFile(floderPath + '/' + adcode + '.json', res.body, 'utf8')
  
    return new Promise(resolve => resolve(res.body))
  } catch (err) {
    errorArea.push({code: adcode, level: 'city', childrenNum: childrenNum})
  }
}

// 下载县
async function crawlerDistrict(adcode, childrenNum) {
  try {

    console.log(adcode, childrenNum)
    let res
    if(childrenNum === 0) {
      res = await request({
        uri: areasCrawlerDomin + areaPath + adcode + '.json'
      })
    } else {
      res = await request({
        uri: areasCrawlerDomin + areaPath + adcode + '_full.json'
      })
    }
    let floderPath = path.resolve(__dirname, 'areas/district')
  
    let isHave = await checkFloder(floderPath)
    if (!isHave) {
      await mkdir(floderPath)
    }
    await writeFile(floderPath + '/' + adcode + '.json', res.body, 'utf8')
  
    return new Promise(resolve => resolve(res.body))
  } catch (err) {
    errorArea.push({code: adcode, level: 'district', childrenNum: childrenNum})
  }
}

// 下载所有地区信息（不需要map数据） tree结构 
async function mkAreaJsonFille(areaJson) {
  let floderPath = path.resolve(__dirname, 'areas')
  let isHave = await checkFloder(floderPath)
  console.log(isHave)
  if (!isHave) {
    await mkdir(floderPath)
  }
  await writeFile(floderPath + '/area.json', JSON.stringify(areaJson), 'utf8')
}



async function crawlerArea() {
  let chinaJson = JSON.parse(await crawlerChina())
  // console.log( chinaJson.features)
  let areaJson = []
  let allProvince = chinaJson.features.filter(item => {
    return item.properties.adcode !== '100000_JD'
  }).map(item => {
    provinceNum++
    return {
      name: item.properties.name,
      pinyin: [].concat(...pinyin(item.properties.name, {style: pinyin.STYLE_NORMAL})),
      code: parseInt(item.properties.adcode),
      center: item.properties.center,
      level: item.properties.level,
      childrenNum: item.properties.childrenNum
    }
  })

  allProvince.forEach(async (item, index) => {
    console.log('-----------------------下载省------------------------')
    await setDelay(1000)
    let provinceJson = JSON.parse(await crawlerProvince(item.code, item.childrenNum))
    let curCitys = provinceJson.features.map(item => {
      cityNum++
      return {
        name: item.properties.name,
        pinyin: [].concat(...pinyin(item.properties.name, {style: pinyin.STYLE_NORMAL})),
        code: parseInt(item.properties.adcode),
        center: item.properties.center,
        level: item.properties.level,
        childrenNum: item.properties.childrenNum
      }
    })
    if(item.childrenNum !== 0) {
      item.children = curCitys
    }
    curCitys.forEach(async (item, index) => {
      console.log('-----------------------下载市------------------------')
      await setDelay(1000)
      let cityJson = JSON.parse(await crawlerCity(item.code, item.childrenNum))
      let curDistricts = cityJson.features.map(item => {
        districtNum++
        return {
          name: item.properties.name,
          pinyin: [].concat(...pinyin(item.properties.name, {style: pinyin.STYLE_NORMAL})),
          code: parseInt(item.properties.adcode),
          center: item.properties.center,
          level: item.properties.level,
          childrenNum: item.properties.childrenNum
        }
      })
      if(item.childrenNum !== 0) {
        item.children = curDistricts
      }
      curDistricts.forEach(async (item, index) => {
        console.log('-----------------------下载县------------------------')
        await setDelay(1000)
        let districtJson = await crawlerDistrict(item.code, item.childrenNum)
        if(index === curDistricts.length -1) {
          console.log(errorArea)
          console.log(provinceNum, cityNum, districtNum)
        }
      })
      // 市级循环完成后 创建全国areaJson
      if(index === curCitys.length - 1) {
        console.log(errorArea)
        areaJson = allProvince
        mkAreaJsonFille(areaJson)
        
      }
    })

    
  })
  console.log()
}


module.exports = {
  crawlerArea: crawlerArea
}
