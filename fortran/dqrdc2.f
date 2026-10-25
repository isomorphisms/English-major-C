      subroutine dqrdc2(x,ldx,n,p,tol,k,qraux,jpvt,work)
      integer ldx,n,p
      integer jpvt(p)
      double precision x(ldx,p),qraux(p),work(p,2),tol
      integer i,j,l,lup,k
      double precision dnrm2,tt,ttt
      double precision ddot,nrmxl,t
      if (n .gt. 0) then
         do j = 1, p
            qraux(j) = dnrm2(n,x(1,j),1)
            work(j,1) = qraux(j)
            work(j,2) = qraux(j)
            if(work(j,2) .eq. 0.0d0) work(j,2) = 1.0d0
         end do
      end if
      lup = min(n,p)
      k = p + 1
      do l = 1, lup
         do
            if (l .ge. k .or. qraux(l) .ge. work(l,2)*tol) exit
            do i=1,n
               t = x(i,l)
               do j=l+1,p
                  x(i,j-1) = x(i,j)
               end do
               x(i,p) = t
            end do
            i = jpvt(l)
            t = qraux(l)
            tt = work(l,1)
            ttt = work(l,2)
            do j=l+1,p
               jpvt(j-1) = jpvt(j)
               qraux(j-1) = qraux(j)
               work(j-1,1) = work(j,1)
               work(j-1,2) = work(j,2)
            end do
            jpvt(p) = i
            qraux(p) = t
            work(p,1) = tt
            work(p,2) = ttt
            k = k - 1
         end do
         if (l .ne. n) then
            nrmxl = dnrm2(n-l+1,x(l,l),1)
            if (nrmxl .ne. 0.0d0) then
               if (x(l,l) .ne. 0.0d0) nrmxl = sign(nrmxl,x(l,l))
               call dscal(n-l+1,1.0d0/nrmxl,x(l,l),1)
               x(l,l) = 1.0d0 + x(l,l)
               if (p .ge. l+1) then
                  do j = l+1, p
                     t = -ddot(n-l+1,x(l,l),1,x(l,j),1)/x(l,l)
                     call daxpy(n-l+1,t,x(l,l),1,x(l,j),1)
                     if (qraux(j) .ne. 0.0d0) then
                        tt = 1.0d0 - (abs(x(l,j))/qraux(j))**2
                        tt = max(tt,0.0d0)
                        t = tt
                        if (dabs(t) .ge. 1d-6) then
                           qraux(j) = qraux(j)*sqrt(t)
                        else
                           qraux(j) = dnrm2(n-l,x(l+1,j),1)
                           work(j,1) = qraux(j)
                        end if
                     end if
                  end do
               end if
               qraux(l) = x(l,l)
               x(l,l) = -nrmxl
            end if
         end if
      end do
      k = min(k - 1, n)
      return
      end
