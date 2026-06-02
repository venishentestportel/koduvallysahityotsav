from flask import Flask, send_from_directory, request, session, redirect, url_for

app = Flask(__name__)
app.secret_key = 'koduvelly_sahitholsav_secret_key'
ADMIN_USERNAME = 'admin'
ADMIN_PASSWORD = 'admin#@!'

@app.route('/')
def home():
    return send_from_directory('.', 'index.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        if request.form.get('username') == ADMIN_USERNAME and request.form.get('password') == ADMIN_PASSWORD:
            session['logged_in'] = True
            return redirect(url_for('admin'))
        else:
            return redirect(url_for('login', error='1'))
    return send_from_directory('.', 'login.html')

@app.route('/admin')
def admin():
    if not session.get('logged_in'):
        return redirect(url_for('login'))
    return send_from_directory('.', 'admin.html')

@app.route('/logout')
def logout():
    session.pop('logged_in', None)
    return redirect(url_for('home'))

@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory('.', filename)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
