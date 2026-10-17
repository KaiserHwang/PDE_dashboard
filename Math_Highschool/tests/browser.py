"""Playwright로 실제 화면·오프라인·기록·응답 흐름을 확인한다."""
import argparse
import json
import subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
root = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--url', default='http://127.0.0.1:8774/')
args = parser.parse_args()
def node_json(code):
    r = subprocess.run(['node', '--input-type=module', '-e', code], cwd=root, capture_output=True, text=True, check=True)
    return json.loads(r.stdout)
lessons = node_json("import {LESSONS} from './src/content.js';console.log(JSON.stringify(LESSONS))")
def fill_answer(page, q, answer):
    box = page.locator('[data-question="'+q['id']+'"]')
    if q['type'] == 'choice':
        box.locator('[data-option="'+str(answer)+'"]').click()
    elif q['type'] == 'interval':
        for key in ['lo', 'hi']:
            box.locator('[data-part="'+key+'"]').fill(str(answer[key]))
        for key in ['loIncl', 'hiIncl']:
            box.locator('[data-part="'+key+'"]').set_checked(answer[key])
    else:
        text = ','.join(map(str, answer)) if isinstance(answer, list) else str(answer)
        box.locator('[data-number]').fill(text if text else '없음')
    return box
with sync_playwright() as p:
    browser = p.chromium.launch()
    for width in [1440, 390]:
        context = browser.new_context(viewport={'width': width, 'height': 950}, is_mobile=width<600, has_touch=width<600, accept_downloads=True)
        page = context.new_page()
        errors = []
        requests = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('request', lambda r: requests.append(r.url))
        page.goto(args.url, wait_until='networkidle')
        assert page.locator('.course-card').count() == 3
        page.screenshot(path=f'/tmp/suneung-home-{width}.png', full_page=True)
        for lesson in lessons:
            for step in range(7):
                page.goto(args.url+'#lesson='+lesson['id']+'&step='+str(step), wait_until='load')
                assert page.locator('#studyPanel').count(), (lesson['id'], step, errors)
                assert not page.locator('.katex-error').count(), (lesson['id'], step)
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'), (width, lesson['id'], step)
                if step == 3:
                    assert page.locator('#repCanvas svg').count() == 1
                    for slider in page.locator('[data-control]').all():
                        slider.fill(slider.get_attribute('min'))
                        slider.fill(slider.get_attribute('max'))
                    assert page.locator('#repCanvas rect').evaluate_all('(nodes)=>nodes.every(n=>Number(n.getAttribute("height"))>=0)'), lesson['id']
                    if lesson['id'] in ['C11', 'P8']:
                        page.evaluate('scrollTo(0,0)')
                        page.screenshot(path=f'/tmp/suneung-{lesson["id"]}-{width}.png', full_page=True)
        l = next(l for l in lessons if l['id'] == 'C11')
        page.goto(args.url+'#lesson=C11&step=5')
        for q in l['checks']:
            if q['role'] == 'basic':
                page.locator('[data-hint="'+q['id']+'"]').click()
            box = fill_answer(page, q, q['answer'])
            box.locator('[data-check]').click()
            assert '이 응답은 맞아요' in box.locator('[id^=feedback_]').inner_text()
        page.goto(args.url+'#lesson=C11&step=6')
        page.locator('#myNote').fill('기울기가 0인 곳은 후보이다. 도함수의 앞뒤 부호로 원함수의 증가와 감소를 확인한다.')
        page.locator('#finishLesson').click()
        assert '교정 후' in page.locator('#lessonEvidence').inner_text()
        page.reload(wait_until='load')
        assert '후보이다' in page.locator('#myNote').input_value()
        page.locator('.skip').focus()
        page.keyboard.press('Enter')
        assert page.url.endswith('#lesson=C11&step=6')
        assert page.evaluate('document.activeElement.id') == 'main'
        page.goto(args.url+'#notes')
        with page.expect_download() as download:
            page.locator('#exportNotes').click()
        assert download.value.suggested_filename.endswith('.json')
        due = page.evaluate('window.suneungApp.state.records.C11.review.due')
        page.evaluate('(at)=>Date.now=()=>at', due)
        page.goto(args.url+'#practice=C11')
        ctx = page.evaluate('window.suneungApp.reviewContext')
        qs = node_json("import {makeReview} from './src/retrieval.js';console.log(JSON.stringify(makeReview('C11',"+str(ctx['seed'])+","+str(ctx['stage'])+")))")
        for q in qs:
            fill_answer(page, q, q['answer'])
        page.locator('#submitReview').click()
        assert '두 새 응답' in page.locator('#reviewResult').inner_text()
        assert page.evaluate('window.suneungApp.state.records.C11.review.stage') == 1
        # 서버로 보내는 노트/API 요청이나 외부 폰트 요청이 없어야 한다.
        assert all(url.startswith(args.url.split('#')[0]) or url.startswith('data:') for url in requests), requests
        assert not errors, errors
        print(f'PASS {width}px: {len(lessons)}×7단계·수식·범위·8형식응답·힌트기록·노트복원·지연복습·본문포커스', flush=True)
        context.close()
    # 입력 형식을 수학 오답으로 기록하지 않으며, 선수 연결이 실제로 보인다.
    context = browser.new_context()
    page = context.new_page()
    page.goto(args.url+'#lesson=C11&step=5')
    lesson = next(l for l in lessons if l['id'] == 'C11')
    for q, answer in [(next(q for q in lesson['checks'] if q['type']=='set'), 'x=3'), (next(q for q in lesson['checks'] if q['type']=='interval'), {'lo':'abc','hi':3,'loIncl':True,'hiIncl':True})]:
        box = fill_answer(page,q,answer)
        box.locator('[data-check]').click()
        assert page.evaluate('(id)=>!window.suneungApp.state.records.C11.attempts[id]?.first', q['id'])
    q = next(q for q in lesson['checks'] if q['type']=='set')
    box = fill_answer(page,q,'0 3')
    box.locator('[data-check]').click()
    assert '다시 확인' in box.locator('[id^=feedback_]').inner_text()
    basics = [q for q in lesson['checks'] if q['role']=='basic']
    page.locator('[data-solution="'+basics[0]['id']+'"]').click()
    box = fill_answer(page,basics[1],basics[1]['answer'])
    box.locator('[data-check]').click()
    assert page.evaluate('(id)=>window.suneungApp.state.records.C11.attempts[id].first.helped', basics[1]['id'])
    page.evaluate("window.suneungApp.state.records.C11.review={due:Date.now(),stage:0,history:[],consecutiveFail:3,needsWork:true}")
    page.goto(args.url+'#review')
    assert page.locator('#main a[href="#lesson=B5"]').count()
    assert page.locator('#main a[href="#lesson=B7"]').count()
    print('PASS malformed answers not recorded; spaced-set misconception; prerequisite suggestions', flush=True)
    context.close()
    # Claude R1: 정답확인으로 노출되는 공통풀이도 연관문항 도움으로 남긴다.
    for saw_shared_solution in [True, False]:
        context = browser.new_context()
        page = context.new_page()
        page.goto(args.url+'#lesson=C11&step=5')
        l = next(l for l in lessons if l['id']=='C11')
        basic = next(q for q in l['checks'] if q['role']=='basic')
        if saw_shared_solution:
            for _ in range(2):
                box = fill_answer(page,basic,'-25')
                box.locator('[data-check]').click()
        for q in l['checks']:
            box = fill_answer(page,q,q['answer'])
            box.locator('[data-check]').click()
        page.goto(args.url+'#lesson=C11&step=6')
        page.locator('#finishLesson').click()
        record = page.evaluate('window.suneungApp.state.records.C11')
        assert (record['initialAt']==0) == saw_shared_solution
        assert record['review']['needsWork'] == saw_shared_solution
        context.close()
    print('PASS shared-solution feedback exposure and first-correct control', flush=True)
    # 실제 오프라인: 단일 HTML을 file:로 열고 외부 통신 없이 동작.
    context = browser.new_context(offline=True)
    page = context.new_page()
    requests = []
    page.on('request', lambda r: requests.append(r.url))
    page.goto((root/'index.html').as_uri()+'#lesson=P8&step=5')
    assert page.locator('.question').count() == 8
    assert not page.locator('.katex-error').count()
    assert not any(r.startswith('http') for r in requests)
    print('PASS offline single HTML: no HTTP requests', flush=True)
    context.close()
    # 손상 JSON 원문 백업을 한 번만 만들고 원문 다운로드가 가능해야 한다.
    context = browser.new_context(accept_downloads=True)
    page = context.new_page()
    page.goto(args.url)
    page.evaluate("localStorage.clear();localStorage.setItem('suneung-concepts-v2','{bad')")
    page.reload(wait_until='load')
    page.reload(wait_until='load')
    assert page.evaluate("Object.keys(localStorage).filter(k=>k.startsWith('suneung-concepts-v2-backup-')).length") == 1
    page.goto(args.url+'#notes')
    with page.expect_download() as download:
        page.locator('#backupRaw').click()
    assert 'backups' in download.value.suggested_filename
    print('PASS corrupt original backup and download', flush=True)
    browser.close()
