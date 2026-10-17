"""Playwright을 설치한 Python으로 실행. --url을 주면 공개 배포도 점검한다."""
import argparse
from pathlib import Path
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--url', default=(Path(__file__).resolve().parents[1] / 'index.html').as_uri())
args = parser.parse_args()
base = args.url.split('#')[0]

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    for width in (1440, 390):
        context = browser.new_context(viewport={'width': width, 'height': 900},
                                      is_mobile=width < 600, has_touch=width < 600,
                                      accept_downloads=True)
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(base + '#catalog', wait_until='load')
        page.wait_for_selector('.lesson-card')
        ids = page.locator('.lesson-card').evaluate_all('(nodes)=>nodes.map(n=>n.hash.split("=")[1])')
        assert len(ids) == 69
        for lesson in ids:
            page.evaluate('(id)=>window.mathApp.lesson(id)', lesson)
            assert page.locator('#visualCanvas svg').count() == 1, lesson
            for endpoint in ('min', 'max'):
                for slider in page.locator('input[data-control]').all():
                    slider.fill(slider.get_attribute(endpoint))
            assert 'NaN' not in page.locator('#readings').inner_text(), lesson
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), lesson
        page.goto(base + '#lesson=derivative', wait_until='load')
        page.wait_for_selector('#visualCanvas svg')
        page.locator('.skip-link').focus()
        page.keyboard.press('Enter')
        assert page.url.endswith('#lesson=derivative')
        assert page.evaluate('document.activeElement.id') == 'main'
        for qi in range(3):
            answer = page.evaluate('(i)=>window.mathApp.entry("derivative").expected[i]', qi)
            if qi == 0:
                page.locator(f'[data-question="0"][data-option="{answer}"]').click()
                page.locator(f'[data-question="0"][data-option="{(answer+1)%3}"]').click()
                assert '한 번 더' in page.locator('#feedback_0').inner_text()
            page.locator(f'[data-question="{qi}"][data-option="{answer}"]').click()
        page.locator('#myExplanation').fill('미분은 평균 변화율의 극한으로 한 순간의 변화율을 나타내며 극한이 존재하는지 확인한다.')
        page.locator('#selfCheck').check()
        assert '확인 완료' in page.locator('#lessonStatus').inner_text()
        page.reload(wait_until='load')
        page.wait_for_selector('#myExplanation')
        assert '평균 변화율' in page.locator('#myExplanation').input_value()
        assert '확인 완료' in page.locator('#lessonStatus').inner_text()
        with page.expect_download() as download:
            page.locator('#exportExperiment').click()
        assert download.value.suggested_filename.endswith('.csv')
        page.evaluate('location.hash="notes"')
        page.wait_for_selector('#downloadNotes')
        with page.expect_download() as download:
            page.locator('#downloadNotes').click()
        assert download.value.suggested_filename.endswith('.json')
        assert not errors, errors
        print(f'PASS {width}px: 69개 개념·매개변수·범위·키보드 이동·오답 힌트·기록 복원·다운로드')
        context.close()
    # 손상된 기록은 백업한 뒤 새 학습을 시작한다.
    context = browser.new_context()
    page = context.new_page()
    page.goto(base, wait_until='load')
    page.evaluate("localStorage.clear();localStorage.setItem('math-highschool-v1','{bad')")
    page.goto(base + '#lesson=function', wait_until='load')
    page.reload(wait_until='load')
    page.wait_for_selector('#myExplanation')
    page.reload(wait_until='load')
    page.wait_for_selector('#myExplanation')
    assert page.evaluate("Object.keys(localStorage).some(k=>k.startsWith('math-highschool-v1-backup-'))")
    assert page.evaluate("Object.keys(localStorage).filter(k=>k.startsWith('math-highschool-v1-backup-')).length") == 1
    page.locator('#myExplanation').fill('복구 후 새로운 설명을 작성해도 이전 원문은 백업에 남아 있다.')
    assert page.evaluate("Object.keys(localStorage).filter(k=>k.startsWith('math-highschool-v1-backup-')).every(k=>localStorage.getItem(k)==='{bad')")
    print('PASS 손상 원문 백업 보존')
    browser.close()
