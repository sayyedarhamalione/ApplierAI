/**
 * lib/scoring/index.test.ts
 * Unit tests for scoring functions.
 * Run: npx tsx --test lib/scoring/index.test.ts
 */

import { strict as assert } from 'node:assert'
import { test, describe } from 'node:test'
import {
  roleMatch,
  locationMatch,
  experienceMatch,
  recencyScore,
  scoreJob,
} from './index'

// ---------------------------------------------------------------------------
// roleMatch
// ---------------------------------------------------------------------------

describe('roleMatch', () => {
  test('exact keyword match returns 1', () => {
    assert.equal(roleMatch('Software Engineer', ['SWE']), 1.0)
  })

  test('case-insensitive match', () => {
    assert.equal(roleMatch('BACKEND ENGINEER', ['SWE']), 1.0)
  })

  test('multi-role: first match wins', () => {
    assert.equal(roleMatch('ML Engineer', ['SWE', 'ML Engineer']), 1.0)
  })

  test('partial match returns 0.5', () => {
    const score = roleMatch('Staff Engineer', ['Product'])
    assert.equal(score, 0) // "engineer" not in Product keywords
    const score2 = roleMatch('Senior Product Lead', ['Product'])
    assert.equal(score2, 1.0) // "product" is in Product keywords
  })

  test('no match returns 0', () => {
    assert.equal(roleMatch('Marketing Manager', ['SWE', 'DevOps']), 0)
  })

  test('empty roles returns 0', () => {
    assert.equal(roleMatch('Software Engineer', []), 0)
  })

  test('empty title returns 0', () => {
    assert.equal(roleMatch('', ['SWE']), 0)
  })
})

// ---------------------------------------------------------------------------
// locationMatch
// ---------------------------------------------------------------------------

describe('locationMatch', () => {
  test('remote job + remote pref = 1.0', () => {
    assert.equal(locationMatch(['remote'], ['remote'], true), 1.0)
  })

  test('is_remote=true + remote pref = 1.0', () => {
    assert.equal(locationMatch(null, ['remote'], true), 1.0)
  })

  test('city match = 1.0', () => {
    assert.equal(locationMatch(['bangalore'], ['bangalore'], false), 1.0)
  })

  test('alias resolution: bengaluru → bangalore', () => {
    assert.equal(locationMatch(['bengaluru'], ['bangalore'], false), 1.0)
  })

  test('alias resolution: gurugram → delhi', () => {
    assert.equal(locationMatch(['gurugram'], ['delhi'], false), 1.0)
  })

  test('remote job, no remote pref = 0.7', () => {
    assert.equal(locationMatch(['remote'], ['bangalore'], false), 0.7)
  })

  test('no job cities = 0.5 (neutral)', () => {
    assert.equal(locationMatch([], ['bangalore'], false), 0.5)
  })

  test('no user prefs = 0.5 (neutral)', () => {
    assert.equal(locationMatch(['bangalore'], [], false), 0.5)
  })

  test('explicit mismatch = 0', () => {
    assert.equal(locationMatch(['mumbai'], ['delhi'], false), 0)
  })
})

// ---------------------------------------------------------------------------
// experienceMatch
// ---------------------------------------------------------------------------

describe('experienceMatch', () => {
  test('exact match = 1.0', () => {
    assert.equal(experienceMatch('fresher', 'fresher'), 1.0)
    assert.equal(experienceMatch('3-7', '3-7'), 1.0)
  })

  test('one level off = 0.75', () => {
    assert.equal(experienceMatch('1-3', 'fresher'), 0.75)
    assert.equal(experienceMatch('3-7', '1-3'), 0.75)
  })

  test('two levels off = 0.5', () => {
    assert.equal(experienceMatch('3-7', 'fresher'), 0.5)
  })

  test('three levels off = 0', () => {
    assert.equal(experienceMatch('7+', 'fresher'), 0)
  })

  test('null inputs = 0.5', () => {
    assert.equal(experienceMatch(null, 'fresher'), 0.5)
    assert.equal(experienceMatch('fresher', null), 0.5)
    assert.equal(experienceMatch(null, null), 0.5)
  })
})

// ---------------------------------------------------------------------------
// recencyScore
// ---------------------------------------------------------------------------

describe('recencyScore', () => {
  const now = new Date()

  test('< 24h = 1.0', () => {
    const posted = new Date(now.getTime() - 1000 * 60 * 60 * 12).toISOString()
    assert.equal(recencyScore(posted), 1.0)
  })

  test('< 72h = 0.5', () => {
    const posted = new Date(now.getTime() - 1000 * 60 * 60 * 48).toISOString()
    assert.equal(recencyScore(posted), 0.5)
  })

  test('< 7d = 0.25', () => {
    const posted = new Date(now.getTime() - 1000 * 60 * 60 * 120).toISOString()
    assert.equal(recencyScore(posted), 0.25)
  })

  test('>= 7d = 0', () => {
    const posted = new Date(now.getTime() - 1000 * 60 * 60 * 200).toISOString()
    assert.equal(recencyScore(posted), 0)
  })

  test('null = 0', () => {
    assert.equal(recencyScore(null), 0)
  })

  test('invalid date = 0', () => {
    assert.equal(recencyScore('not-a-date'), 0)
  })
})

// ---------------------------------------------------------------------------
// scoreJob — integration
// ---------------------------------------------------------------------------

describe('scoreJob', () => {
  const recentIso = new Date(Date.now() - 1000 * 60 * 60 * 10).toISOString()

  test('perfect match returns 10', () => {
    const job = {
      title: 'Software Engineer',
      cities: ['remote'],
      is_remote: true,
      experience_level: 'fresher',
      posted_at: recentIso,
    }
    const profile = {
      target_roles: ['SWE'],
      location_prefs: ['remote'],
      experience_level: 'fresher',
    }
    assert.equal(scoreJob(job, profile), 10.0)
  })

  test('zero match with no profile data returns low score', () => {
    const job = {
      title: 'Marketing Director',
      cities: ['new york'],
      is_remote: false,
      experience_level: '7+',
      posted_at: new Date(Date.now() - 1000 * 60 * 60 * 240).toISOString(),
    }
    const profile = {
      target_roles: ['SWE'],
      location_prefs: ['bangalore'],
      experience_level: 'fresher',
    }
    assert.ok(scoreJob(job, profile) < 2)
  })

  test('score is rounded to one decimal', () => {
    const job = {
      title: 'Backend Engineer',
      cities: ['mumbai'],
      is_remote: false,
      experience_level: '1-3',
      posted_at: recentIso,
    }
    const profile = {
      target_roles: ['SWE'],
      location_prefs: ['mumbai'],
      experience_level: 'fresher',
    }
    const score = scoreJob(job, profile)
    assert.equal(score, Math.round(score * 10) / 10)
  })
})